$(document).ready(function () {
    let _username = $("input[name=userNewPwd]");
    let _mail = $("input[name=mailNewPwd]");
    let _password = $("input[name=pwdNewPwd]");
    let _tipoUt = $("select[name=tipoUtNewPwd]");
    let _btnInviaReimposta = $("#btnSendReimposta");

    /* *************************** AVVIO ************************ */

    _btnInviaReimposta.on("click", function () {
        _username.removeClass("is-invalid");
        _password.removeClass("is-invalid");
        _mail.removeClass("is-invalid");
        _username.parent().removeClass("alert-danger");
        _password.parent().removeClass("alert-danger");
        _mail.parent().removeClass("alert-danger");
        $(".msg").text("");

        if (_username.val() == "") {
            _username.addClass("is-invalid"); // bordo textbox
            _username.parent().addClass("alert-danger"); // icona
            return;
        }
        else if (_mail.val() == "") {
            _mail.addClass("is-invalid"); // bordo textbox
            _mail.parent().addClass("alert-danger"); // icona
            return
        } else if (_tipoUt.val() == "") {
            _tipoUt.addClass("is-invalid"); // bordo textbox
            _tipoUt.parent().addClass("alert-danger"); // icona
            return
        } else if (_password.val() == "") {
            _password.addClass("is-invalid"); // bordo textbox
            _password.parent().addClass("alert-danger"); // icona
        }
        let reimpostaPwd = inviaRichiesta('/api/reimpostaPwd', 'POST', { "username": _username.val(),"mail":_mail.val(), "password": _password.val(), "tipoUt": _tipoUt.val() });
        reimpostaPwd.fail(function (jqXHR, test_status, str_error) {
            if (jqXHR.status == 401) { // unauthorized
                $(".msg").text("username, mail o tipologia utente non validi").css({ "color": "#a00", "marginBottom": "10px" });
            } else
                printErrors(jqXHR, "msg");
        });
        reimpostaPwd.done(function (data) {
            window.location.href = "index.html"
        });
    });
});