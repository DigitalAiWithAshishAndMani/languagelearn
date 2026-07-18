from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRY_MINUTES
import sqlite3

app = FastAPI(
    title="Language Learn API",
    description="Backend API for Language Learning and Training Application with RAG",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # React + Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(
    schemes=['bcrypt'], #hash algo
    deprecated = 'auto' #configuration, if in future we change scheme CryptContext can access older hashes
)



""" example
print(
    pwd_context.hash("123456"),     #it generates random hash even for the same password by the method of random salt
    pwd_context.hash("123456")
)
"""

conn = sqlite3.connect("users.db", check_same_thread=False) #connect me to the users.db, if not avail create one
cursor = conn.cursor() #conn as the line to the db and cursor as the person speaking through that line

cursor.execute("""                                      
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL)
               """)                             #the draft of the table, saying Database, Run this SQL command
conn.commit()                                   #permanently save the drafted table



class User(BaseModel): #creates a blue print for Fast API to expect 3 response from the user JSON format
    username: str
    email: str
    password: str



@app.get('/')             #retrieves the info from the server to the browser
async def home():
    return {'message':'hello'}

@app.post('/register')    #sending user details to the server from the browser
async def register(user: User): # converts the JSON to User object
    hashed_password = pwd_context.hash(user.password)
    cursor.execute(             #executing insert query
        """
        INSERT INTO users( username, email, password)
        VALUES(?, ?, ?)
        """,
        (
            user.username,
            user.email,
            hashed_password
        )
    )
    conn.commit()               #commited changes to SQL LITE

    return{"message": "user registered successfully"}


@app.get('/users')
async def get_users():
    cursor.execute("SELECT * FROM users")   #fetch me all rows from users table
    users = cursor.fetchall()               #bring all results back
    return users

class Loginuser(BaseModel): #Login Page Blueprint
    email: str
    password:str


@app.post('/Login')
async def user_login(user:Loginuser):   #Login Page Logic Function
    cursor.execute("SELECT * FROM users WHERE email=?", (user.email,)) 
    db_user = cursor.fetchone()         #Fetchin user db from his/her email

    if db_user is None:
        return {"message":"User Not Found"}
    
    if not pwd_context.verify(user.password, db_user[3]):
        return {"message":"invalid credentials"}
    
    else:
        payload = {"id": db_user[0], 
                   "email": db_user[2], 
                   "exp": datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRY_MINUTES)
                   }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return {
            "access_token": token,
            "token_type": "bearer" 
        }