from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
import base64
import os

class ReportEncryptor:
    def __init__(self):
        self.key = os.getenv('ENCRYPTION_KEY', 'ThisIsASecretKey123').encode('utf-8')
        if len(self.key) not in [16, 24, 32]:
            self.key = pad(self.key, 32)
    
    def encrypt_file(self, file_path):
        # Generate a random IV
        iv = get_random_bytes(16)
        
        # Create cipher object
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        
        # Read file content
        with open(file_path, 'rb') as f:
            plaintext = f.read()
        
        # Encrypt the content
        ciphertext = cipher.encrypt(pad(plaintext, AES.block_size))
        
        # Combine IV + ciphertext
        encrypted_data = iv + ciphertext
        
        # Return base64 encoded result
        return base64.b64encode(encrypted_data).decode('utf-8')
    
    def decrypt_file(self, encrypted_data, output_path):
        # Decode base64
        encrypted_data = base64.b64decode(encrypted_data)
        
        # Extract IV and ciphertext
        iv = encrypted_data[:16]
        ciphertext = encrypted_data[16:]
        
        # Create cipher object
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        
        # Decrypt and unpad
        plaintext = unpad(cipher.decrypt(ciphertext), AES.block_size)
        
        # Write to file
        with open(output_path, 'wb') as f:
            f.write(plaintext)