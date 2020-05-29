$(document).ready(function() {
    let _username = $("input[name=username]");
    let _password = $("input[name=password]");
    let _tipoUt = $("select[name=tipoUt]");
    let _btnLogin = $("#btnLogin");

    /* *************************** AVVIO ************************ */

    _btnLogin.on("click", function() {
        _username.removeClass("is-invalid");
        _password.removeClass("is-invalid");
        _tipoUt.removeClass("is-invalid");
        _username.parent().removeClass("alert-danger");
        _password.parent().removeClass("alert-danger");
        _tipoUt.parent().removeClass("alert-danger");
        $(".msg").text("");
		
        if (_username.val() == "") {
            _username.addClass("is-invalid"); // bordo textbox
            _username.parent().addClass("alert-danger"); // icona
            return;
        } 
		else if (_password.val() == "") {
            _password.addClass("is-invalid"); // bordo textbox
            _password.parent().addClass("alert-danger"); // icona
            return
        } else if (_tipoUt.val() == "") {
            _tipoUt.addClass("is-invalid"); // bordo textbox
            _tipoUt.parent().addClass("alert-danger"); // icona
            return
        }
        let loginRQ = inviaRichiesta('/api/login', 'POST', { "username": _username.val(), "password": _password.val(), "tipoUt": _tipoUt.val()});
        loginRQ.fail(function(jqXHR, test_status, str_error) {
            if (jqXHR.status == 401) { // unauthorized
                $(".msg").text("username, password o tipologia utente non validi").css({ "color": "#a00", "marginBottom": "10px" });
            } else
                error(jqXHR, test_status, str_error)
        });
        loginRQ.done(function(data) {
            window.location.href = "ricoveri.html"
        });
    });
});