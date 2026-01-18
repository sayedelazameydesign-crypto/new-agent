import os
import json
import logging
import asyncio
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from google.genai import GoogleGenAI

logger = logging.getLogger(__name__)


@dataclass
class RetryConfig:
    """Configuration for retry logic."""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 10.0
    exponential_base: float = 2.0


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting."""
    requests_per_minute: int = 60
    tokens_per_minute: int = 100000


class RateLimiter:
    """Simple token bucket rate limiter."""
    
    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.request_timestamps: List[datetime] = []
        self.lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Wait until a request can be made within rate limits."""
        async with self.lock:
            now = datetime.utcnow()
            cutoff = now - timedelta(minutes=1)
            
            # Remove old timestamps
            self.request_timestamps = [
                ts for ts in self.request_timestamps if ts > cutoff
            ]
            
            # Check if we're at the limit
            if len(self.request_timestamps) >= self.config.requests_per_minute:
                # Calculate wait time
                oldest = self.request_timestamps[0]
                wait_seconds = 60 - (now - oldest).total_seconds()
                
                if wait_seconds > 0:
                    logger.warning(f"Rate limit reached. Waiting {wait_seconds:.2f}s")
                    await asyncio.sleep(wait_seconds)
            
            # Record this request
            self.request_timestamps.append(datetime.utcnow())


class GeminiClient:
    """
    Enhanced client for interacting with Google Gemini API.
    
    Features:
    - Automatic retry with exponential backoff
    - Rate limiting
    - Request validation
    - Structured error handling
    - Response caching (optional)
    - Token usage tracking
    """
    
    # Model configurations
    AVAILABLE_MODELS = {
        "gemini-3-pro-preview": {"max_tokens": 32768, "supports_vision": True},
        "gemini-2-flash": {"max_tokens": 8192, "supports_vision": False},
        "gemini-1.5-pro": {"max_tokens": 2000000, "supports_vision": True},
    }
    
    # Limits
    MAX_MESSAGE_LENGTH = 100000
    MAX_CONTEXT_LENGTH = 50000
    MAX_PLAN_STEPS = 50
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-3-pro-preview",
        retry_config: Optional[RetryConfig] = None,
        rate_limit_config: Optional[RateLimitConfig] = None,
        enable_caching: bool = False,
    ):
        """
        Initialize the GeminiClient.
        
        Args:
            api_key: API key for Google Gemini (reads from API_KEY env var if not provided)
            model: Model name to use
            retry_config: Configuration for retry behavior
            rate_limit_config: Configuration for rate limiting
            enable_caching: Whether to cache responses
            
        Raises:
            ValueError: If API key is missing or model is invalid
        """
        # Validate and set API key
        self.api_key = api_key or os.getenv("API_KEY")
        if not self.api_key:
            raise ValueError(
                "API_KEY not found. Provide it as argument or set API_KEY environment variable"
            )
        
        # Validate model
        if model not in self.AVAILABLE_MODELS:
            raise ValueError(
                f"Invalid model '{model}'. Available models: {list(self.AVAILABLE_MODELS.keys())}"
            )
        
        self.model = model
        self.model_config = self.AVAILABLE_MODELS[model]
        
        # Initialize Google AI client
        try:
            self.ai = GoogleGenAI(api_key=self.api_key)
        except Exception as e:
            raise ValueError(f"Failed to initialize Google AI client: {e}")
        
        # Setup retry and rate limiting
        self.retry_config = retry_config or RetryConfig()
        self.rate_limiter = RateLimiter(rate_limit_config or RateLimitConfig())
        
        # Optional caching
        self.enable_caching = enable_caching
        self.cache: Dict[str, Any] = {}
        
        # Usage tracking
        self.total_requests = 0
        self.total_tokens = 0
        self.failed_requests = 0
        
        logger.info(
            f"GeminiClient initialized - Model: {model}, "
            f"Max tokens: {self.model_config['max_tokens']}, "
            f"Retry attempts: {self.retry_config.max_attempts}"
        )
    
    async def send_message(
        self,
        message: str,
        system_instruction: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Send a message to Gemini with enhanced error handling and validation.
        
        Args:
            message: The message to send
            system_instruction: Optional system instruction
            json_mode: Whether to request JSON response format
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens in response
            
        Returns:
            str: Response text from the model
            
        Raises:
            ValueError: If inputs are invalid
            RuntimeError: If API call fails after all retries
        """
        # Validate inputs
        self._validate_message(message)
        if system_instruction:
            self._validate_message(system_instruction, "system_instruction")
        
        if not 0.0 <= temperature <= 1.0:
            raise ValueError("Temperature must be between 0.0 and 1.0")
        
        # Check cache
        if self.enable_caching:
            cache_key = self._get_cache_key(message, system_instruction, json_mode)
            if cache_key in self.cache:
                logger.debug("Returning cached response")
                return self.cache[cache_key]
        
        # Build config
        config = {
            "temperature": temperature,
        }
        
        if system_instruction:
            config["systemInstruction"] = system_instruction
        
        if json_mode:
            config["responseMimeType"] = "application/json"
        
        if max_tokens:
            config["maxOutputTokens"] = min(max_tokens, self.model_config["max_tokens"])
        
        # Execute with retry
        response_text = await self._execute_with_retry(message, config)
        
        # Cache if enabled
        if self.enable_caching:
            self.cache[cache_key] = response_text
        
        return response_text
    
    async def _execute_with_retry(
        self,
        message: str,
        config: Dict[str, Any],
    ) -> str:
        """Execute API call with exponential backoff retry."""
        last_exception = None
        
        for attempt in range(1, self.retry_config.max_attempts + 1):
            try:
                # Rate limiting
                await self.rate_limiter.acquire()
                
                # Make API call
                logger.debug(f"API call attempt {attempt}/{self.retry_config.max_attempts}")
                response = await self.ai.models.generateContent(
                    model=self.model,
                    contents=message,
                    config=config
                )
                
                # Track usage
                self.total_requests += 1
                if hasattr(response, 'usage_metadata'):
                    self.total_tokens += getattr(response.usage_metadata, 'total_tokens', 0)
                
                # Return response
                return response.text or ""
                
            except Exception as e:
                last_exception = e
                logger.warning(f"Attempt {attempt} failed: {str(e)}")
                
                # Don't retry on certain errors
                if self._is_non_retryable_error(e):
                    logger.error(f"Non-retryable error: {str(e)}")
                    break
                
                # Calculate backoff delay
                if attempt < self.retry_config.max_attempts:
                    delay = min(
                        self.retry_config.base_delay * (self.retry_config.exponential_base ** (attempt - 1)),
                        self.retry_config.max_delay
                    )
                    logger.info(f"Retrying in {delay:.2f}s...")
                    await asyncio.sleep(delay)
        
        # All retries failed
        self.failed_requests += 1
        raise RuntimeError(
            f"API call failed after {self.retry_config.max_attempts} attempts. "
            f"Last error: {str(last_exception)}"
        )
    
    async def create_plan(
        self,
        task: str,
        context: Optional[str] = None,
        max_steps: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Create a detailed execution plan for a task.
        
        Args:
            task: The task to plan for
            context: Additional context (e.g., repository URL)
            max_steps: Maximum number of steps to generate
            
        Returns:
            List of step dictionaries with structure:
            {
                'step_number': int,
                'action': str,
                'expected_outcome': str,
                'commands': List[str],
                'estimated_time': str (optional),
                'dependencies': List[int] (optional)
            }
        """
        # Validate inputs
        if not task or not task.strip():
            raise ValueError("Task cannot be empty")
        
        max_steps = max_steps or self.MAX_PLAN_STEPS
        
        # Build enhanced prompt
        context_str = f"Context: {context}" if context else "Context: Standard execution environment"
        
        prompt = f"""Create a detailed step-by-step technical execution plan for the following task:

TASK: {task}

{context_str}

Requirements:
- Break down the task into clear, actionable steps
- Each step should have specific commands where applicable
- Include expected outcomes for verification
- Maximum {max_steps} steps
- Consider dependencies between steps
"""
        
        system_instruction = """You are Celia AI Agent, an expert in technical planning and execution.

Respond ONLY with a valid JSON array. Each object must have this exact structure:
{
    "step_number": <integer>,
    "action": "<clear description of what to do>",
    "expected_outcome": "<measurable result>",
    "commands": ["<command1>", "<command2>"],
    "estimated_time": "<e.g., '2 minutes'>",
    "dependencies": [<step_numbers this depends on>]
}

Ensure:
- Commands are safe and executable
- No destructive operations without explicit confirmation
- Steps are in logical order
- Each step builds on previous ones"""
        
        try:
            response_text = await self.send_message(
                message=prompt,
                system_instruction=system_instruction,
                json_mode=True,
                temperature=0.3,  # Lower temperature for more consistent planning
            )
            
            # Parse and validate
            plan = json.loads(response_text)
            
            if not isinstance(plan, list):
                raise ValueError("Plan must be a JSON array")
            
            # Validate structure
            validated_plan = self._validate_plan(plan)
            
            logger.info(f"Generated plan with {len(validated_plan)} steps")
            return validated_plan
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse plan JSON: {e}")
            return self._get_fallback_plan(task)
        except Exception as e:
            logger.error(f"Plan creation failed: {e}")
            return self._get_fallback_plan(task)
    
    async def summarize_results(
        self,
        logs: str,
        files: List[str],
        execution_time: Optional[float] = None,
        status: str = "completed",
    ) -> str:
        """
        Generate a professional summary of execution results.
        
        Args:
            logs: Execution logs
            files: List of generated files
            execution_time: Total execution time in seconds
            status: Execution status
            
        Returns:
            Formatted summary text
        """
        # Truncate logs intelligently
        truncated_logs = self._truncate_logs(logs, max_length=2000)
        
        # Build comprehensive prompt
        time_str = f"\nExecution time: {execution_time:.2f} seconds" if execution_time else ""
        
        prompt = f"""Analyze the following execution results and create a professional summary:

STATUS: {status}
{time_str}

GENERATED FILES:
{self._format_file_list(files)}

EXECUTION LOGS (last 2000 chars):
```
{truncated_logs}
```

Provide a summary with:
1. Overall execution status and success
2. Key accomplishments
3. Files generated and their purposes
4. Any warnings or issues encountered
5. Next steps or recommendations"""
        
        system_instruction = """You are a technical report writer. Create clear, professional summaries that:
- Use active voice
- Highlight key results
- Identify any issues or warnings
- Provide actionable insights
- Are concise but comprehensive"""
        
        try:
            summary = await self.send_message(
                message=prompt,
                system_instruction=system_instruction,
                temperature=0.5,
            )
            return summary
            
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return self._get_fallback_summary(logs, files, status)
    
    def _validate_message(self, message: str, param_name: str = "message") -> None:
        """Validate message content."""
        if not message or not message.strip():
            raise ValueError(f"{param_name} cannot be empty")
        
        if len(message) > self.MAX_MESSAGE_LENGTH:
            raise ValueError(
                f"{param_name} too long ({len(message)} chars). "
                f"Maximum: {self.MAX_MESSAGE_LENGTH}"
            )
    
    def _validate_plan(self, plan: List[Dict]) -> List[Dict[str, Any]]:
        """Validate and sanitize plan structure."""
        validated = []
        
        for i, step in enumerate(plan[:self.MAX_PLAN_STEPS], 1):
            if not isinstance(step, dict):
                logger.warning(f"Step {i} is not a dictionary, skipping")
                continue
            
            validated_step = {
                "step_number": step.get("step_number", i),
                "action": str(step.get("action", "Undefined action")),
                "expected_outcome": str(step.get("expected_outcome", "N/A")),
                "commands": [str(cmd) for cmd in step.get("commands", [])],
            }
            
            # Optional fields
            if "estimated_time" in step:
                validated_step["estimated_time"] = str(step["estimated_time"])
            
            if "dependencies" in step and isinstance(step["dependencies"], list):
                validated_step["dependencies"] = [int(d) for d in step["dependencies"]]
            
            validated.append(validated_step)
        
        return validated
    
    def _truncate_logs(self, logs: str, max_length: int = 2000) -> str:
        """Intelligently truncate logs to show most relevant parts."""
        if len(logs) <= max_length:
            return logs
        
        # Take last portion (most recent logs)
        return "... [earlier logs truncated]\n" + logs[-max_length:]
    
    def _format_file_list(self, files: List[str]) -> str:
        """Format file list for display."""
        if not files:
            return "No files generated"
        
        return "\n".join(f"- {file}" for file in files)
    
    def _get_fallback_plan(self, task: str) -> List[Dict[str, Any]]:
        """Return a basic fallback plan if generation fails."""
        return [{
            "step_number": 1,
            "action": f"Manual execution required for: {task[:100]}",
            "expected_outcome": "Task completion through manual intervention",
            "commands": [],
            "estimated_time": "Variable",
        }]
    
    def _get_fallback_summary(
        self,
        logs: str,
        files: List[str],
        status: str,
    ) -> str:
        """Generate basic summary if AI generation fails."""
        return f"""# Execution Summary

**Status**: {status}

**Files Generated**: {len(files)}
{self._format_file_list(files)}

**Logs** (last 500 chars):
```
{logs[-500:]}
```

*Note: Detailed AI summary generation failed. This is a basic fallback summary.*
"""
    
    def _get_cache_key(
        self,
        message: str,
        system_instruction: Optional[str],
        json_mode: bool,
    ) -> str:
        """Generate cache key for a request."""
        import hashlib
        
        cache_str = f"{message}|{system_instruction or ''}|{json_mode}"
        return hashlib.md5(cache_str.encode()).hexdigest()
    
    def _is_non_retryable_error(self, error: Exception) -> bool:
        """Check if an error should not be retried."""
        error_str = str(error).lower()
        
        non_retryable = [
            "invalid api key",
            "authentication failed",
            "invalid model",
            "content policy violation",
        ]
        
        return any(msg in error_str for msg in non_retryable)
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """
        Get usage statistics.
        
        Returns:
            Dictionary with usage metrics
        """
        return {
            "total_requests": self.total_requests,
            "failed_requests": self.failed_requests,
            "success_rate": (
                (self.total_requests - self.failed_requests) / self.total_requests * 100
                if self.total_requests > 0 else 0
            ),
            "total_tokens": self.total_tokens,
            "cached_responses": len(self.cache) if self.enable_caching else 0,
        }
    
    def clear_cache(self) -> None:
        """Clear the response cache."""
        self.cache.clear()
        logger.info("Response cache cleared")
    
    async def health_check(self) -> bool:
        """
        Perform a health check on the API connection.
        
        Returns:
            bool: True if API is accessible, False otherwise
        """
        try:
            response = await self.send_message(
                message="ping",
                temperature=0,
            )
            logger.info("Health check passed")
            return True
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False