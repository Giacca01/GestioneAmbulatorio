$(document).ready(function () {
    $("#btnRegistrati").on("click", gestRegistrati);
    $("#pErrorReg").hide();
});

function gestRegistrati() {

    if ($("#txtRegNome").val() != "") {
        if ($("#txtRegCognome").val() != "") {
            if ($("#txtRegCitta").val() != "") {
                if ($("#txtRegTelefono").val().length == 11 && !(isNaN($("#txtRegTelefono").val()))) {
                    if ($("#txtRegMail").val().includes("@")) {
                        if ($("#txtRegUser").val() != "") {
                            if ($("#txtRegPwd").val() != "") {
                                if (Date.parse($("#txtRegDataNascita").val())) {
                                    let dataNascita = $("#txtRegDataNascita").val().split('-')[2] + "/" + $("#txtRegDataNascita").val().split('-')[1] + "/" + $("#txtRegDataNascita").val().split('-')[0];
                                    $("#pErrorReg").hide();
                                    let par = {
                                        "nome": $("#txtRegNome").val(),
                                        "cognome": $("#txtRegCognome").val(),
                                        "citta": $("#txtRegCitta").val(),
                                        "dataNascita": dataNascita,
                                        "telefono": $("#txtRegTelefono").val(),
                                        "mail": $("#txtRegMail").val(),
                                        "user": $("#txtRegUser").val(),
                                        "pwd": $("#txtRegPwd").val()
                                    };
                                    par = JSON.stringify(par);
                                    let registrati = sendRequestNoCallback("/api/registrati", "POST", par);
                                    registrati.done(function (data) {
                                        window.location.replace("index.html");
                                    });
                                    registrati.fail(function (jqXHR) {
                                        printErrors(jqXHR, "pErrorReg");
                                    });
                                }  else{
                                    $("#pErrorReg").show();
                                    $("#pErrorReg").html("Inserire una Data di Nascita");
                                }
                            }else{
                                $("#pErrorReg").show();
                                $("#pErrorReg").html("Inserire una Password valido");
                            }
                        }else{
                            $("#pErrorReg").show();
                            $("#pErrorReg").html("Inserire uno Username valido");
                        }
                    }else{
                        $("#pErrorReg").show();
                        $("#pErrorReg").html("L' Indirizzo Mail deve contenere la @");
                    }
                }else{
                    $("#pErrorReg").show();
                    $("#pErrorReg").html("Il numero di telefono deve essere di 11 cifre");
                }
            }else{
                $("#pErrorReg").show();
                $("#pErrorReg").html("Inserire una Città valida");
            }
        }else{
            $("#pErrorReg").show();
            $("#pErrorReg").html("Inserire un Cognome valido");
        }
    }else{
        $("#pErrorReg").show();
        $("#pErrorReg").html("Inserire un Nome valido");
    }
}