import hashlib
import os
import hmac
import time
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models

# Standard OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Simple, lightweight token signing to avoid pyjwt binary issues.
# We sign tokens using a secret key, expiration timestamp, and HMAC-SHA256.
SECRET_KEY = os.getenv("SIGNBRIDGE_SECRET_KEY", "super_secret_local_dev_key_signbridge_ai")
TOKEN_EXPIRE_SECONDS = 86400  # 24 hours

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = os.urandom(16)
    rounds = 100000
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)
    # Store salt, rounds, and hash key in a single string
    return f"{salt.hex()}:{rounds}:{key.hex()}"

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against the stored PBKDF2 hash."""
    try:
        parts = hashed_password.split(":")
        if len(parts) != 3:
            return False
        salt = bytes.fromhex(parts[0])
        rounds = int(parts[1])
        stored_key = bytes.fromhex(parts[2])
        
        test_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)
        return hmac.compare_digest(stored_key, test_key)
    except Exception:
        return False

def create_access_token(username: str) -> str:
    """Create a lightweight signed JWT-like token (HMAC signed string)."""
    expires_at = int(time.time()) + TOKEN_EXPIRE_SECONDS
    payload = f"{username}:{expires_at}"
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{signature}"

def verify_token(token: str) -> str:
    """Verify token signature and expiration, returning the username."""
    try:
        parts = token.split(":")
        if len(parts) != 3:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token structure"
            )
        username, expires_at_str, signature = parts
        expires_at = int(expires_at_str)
        
        # Check expiration
        if time.time() > expires_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
            
        # Verify signature
        payload = f"{username}:{expires_at_str}"
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token signature"
            )
            
        return username
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token data"
        )

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """Dependency to retrieve the logged-in user from the token."""
    username = verify_token(token)
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user
