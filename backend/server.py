from fastapi import FastAPI

# Initialize FastAPI application
app = FastAPI()

# Include routers here
# from your_router import router as ai_chat_router
# app.include_router(ai_chat_router)

@app.get("/")
def read_root():
    return {"Hello": "World"}