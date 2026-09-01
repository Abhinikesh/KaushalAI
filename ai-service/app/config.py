from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "KaushalAI AI Service"
    debug: bool = False
    # Populated from environment; no defaults for secrets.
    mongo_uri: str = ""
    redis_url: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
