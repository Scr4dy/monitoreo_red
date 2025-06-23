const users = {
    "admin": CryptoJS.SHA256("admin123").toString()
};

function login(event) {
    event.preventDefault(); // Evita el envío del formulario

    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const hash = CryptoJS.SHA256(pass).toString();

    const errorMsg = document.getElementById("error-message");
    errorMsg.textContent = ""; // Limpia errores anteriores

    if (users[user] && users[user] === hash) {
        localStorage.setItem("loggedIn", "true");
        window.location.href = "/components/dashboard.html";
    } else {
        errorMsg.textContent = "Credenciales inválidas.";
    }
}