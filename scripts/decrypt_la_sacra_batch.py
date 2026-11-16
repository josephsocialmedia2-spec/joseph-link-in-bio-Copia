#!/usr/bin/env python3
"""Apre un lotto CASE247 cifrato esclusivamente sul proprio computer."""
from __future__ import annotations
import argparse,base64,json,io,zipfile
from pathlib import Path
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def decrypt(payload,private_pem):
    magic=b"CASE247ENC1\n"
    if not payload.startswith(magic):raise ValueError("Formato CASE247 non valido")
    n=int.from_bytes(payload[len(magic):len(magic)+4],"big")
    if not 100<=n<=10000:raise ValueError("Header non valido")
    start=len(magic)+4;meta=json.loads(payload[start:start+n])
    key=load_pem_private_key(private_pem,password=None).decrypt(
       base64.b64decode(meta["wrapped_key"]),
       padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
    return AESGCM(key).decrypt(base64.b64decode(meta["nonce"]),payload[start+n:],None)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("archive");p.add_argument("--key",required=True)
    p.add_argument("--out",default="lotto_decriptato.zip")
    a=p.parse_args()
    plaintext=decrypt(Path(a.archive).read_bytes(),Path(a.key).read_bytes())
    with zipfile.ZipFile(io.BytesIO(plaintext)) as z:
        print("Contenuti:",", ".join(z.namelist()))
    Path(a.out).write_bytes(plaintext)
    print("Decriptato:",a.out)

if __name__=="__main__":main()
