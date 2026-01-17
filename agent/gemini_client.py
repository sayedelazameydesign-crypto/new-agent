
import os
import json
import logging
from typing import Optional, List, Dict
from google.genai import GoogleGenAI

logger = logging.getLogger(__name__)

class GeminiClient:
    """
    Client for interacting with Google Gemini API, replacing legacy Claude client.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-3-pro-preview",
    ):
        # API Key is pulled from environment process.env.API_KEY as per standard injection
        self.api_key = api_key or os.getenv("API_KEY")
        
        if not self.api_key:
            raise ValueError("API_KEY not found in environment")
        
        self.ai = GoogleGenAI(api_key=self.api_key)
        self.model = model
        
        logger.info(f"GeminiClient initialized with model: {model}")

    async def send_message(
        self,
        message: str,
        system_instruction: Optional[str] = None,
        json_mode: bool = False
    ) -> str:
        try:
            config = {}
            if system_instruction:
                config["systemInstruction"] = system_instruction
            if json_mode:
                config["responseMimeType"] = "application/json"

            response = await self.ai.models.generateContent(
                model=self.model,
                contents=message,
                config=config
            )
            return response.text or ""
            
        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            raise

    async def create_plan(self, task: str, context: Optional[str] = None) -> List[Dict]:
        prompt = f"Create a step-by-step technical plan for: {task}. Context: {context if context else 'Standard'}"
        sys_instr = "You are Celia AI Agent. Respond ONLY with a JSON array of objects: {'step_number': int, 'action': str, 'expected_outcome': str, 'commands': list[str]}"
        
        response_text = await self.send_message(prompt, system_instruction=sys_instr, json_mode=True)
        try:
            return json.loads(response_text)
        except:
            return [{"step_number": 1, "action": "Manual Task Execution", "expected_outcome": "Goal reached", "commands": []}]

    async def summarize_results(self, logs: str, files: List[str]) -> str:
        prompt = f"Summarize these logs and files into a final report:\nLOGS: {logs[-1000:]}\nFILES: {', '.join(files)}"
        return await self.send_message(prompt, system_instruction="Provide a professional execution summary.")
