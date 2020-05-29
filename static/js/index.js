$(document).ready(function () {
    let chkToken = inviaRichiesta('/api/chkToken', 'POST', {});
    chkToken.fail(function (jqXHR, test_status, str_error) {
        console.log(jqXHR+" "+ test_status+" "+str_error);
    });
    chkToken.done(function (data) {
        window.location.href = "ricoveri.html"
    });

    $("#btnReg").on("click", function () {
        window.location.replace("registrati.html");
    });
    $("#btnReimpostaPwd").on("click", function () {
        window.location.replace("nuovaPassword.html");
    });
});
