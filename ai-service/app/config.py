from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "KaushalAI AI Service"
    debug: bool = False
    mongo_uri: str = ""
    redis_url: str = ""
    # LLM — startup warning is emitted in llm_client.py if this is empty
    anthropic_api_key: str = ""
    # ChromaDB persistent storage directory
    chroma_data_dir: str = "./chroma_data"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
