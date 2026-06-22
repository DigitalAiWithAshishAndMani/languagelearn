from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Language Learn API"
    DEBUG: bool = True
    
    # Database Settings
    DATABASE_URL: str = Field(default="sqlite:///./database.db", validation_alias="DATABASE_URL")
    
    # Authentication Settings
    JWT_SECRET_KEY: str = Field(default="super_secret_key_change_me_in_production", validation_alias="JWT_SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Local OpenAI-Compatible LLM Settings
    LOCAL_MODEL_BASE_URL: str = Field(default="http://localhost:1234/v1", validation_alias="LOCAL_MODEL_BASE_URL")
    LOCAL_MODEL_API_KEY: str = Field(default="lm-studio-key-not-needed", validation_alias="LOCAL_MODEL_API_KEY")
    LOCAL_MODEL_NAME: str = Field(default="meta-llama-3-8b-instruct", validation_alias="LOCAL_MODEL_NAME")
    LOCAL_EMBEDDING_MODEL_NAME: str = Field(default="nomic-embed-text-v1.5", validation_alias="LOCAL_EMBEDDING_MODEL_NAME")

    # Judge0 Code Execution Settings
    JUDGE0_API_URL: str = Field(default="http://localhost:2358", validation_alias="JUDGE0_API_URL")
    JUDGE0_API_KEY: str = Field(default="", validation_alias="JUDGE0_API_KEY")

    # Target Supported Programming Languages
    SUPPORTED_LANGUAGES: set[str] = {"python", "java", "cpp", "javascript"}
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

