let idPazGlobal = -1;

$(document).ready(function () {
    let chkToken = inviaRichiesta('/api/chkToken', 'POST', {});
    chkToken.fail(function (jqXHR, test_status, str_error) {
        printErrors(jqXHR, "pErrorElimPaz");
    });
    chkToken.done(function (data) {
        if (data.admin == false) {
            $('#navPaz').remove();
            $('a[name ="navSoloMedici"]').remove();
        }

        if (data.tipoUt == "PAZIENTE") {
            window.location = "index.html";
        }else{
            gestInvioPazienti();
        }
    });
    $("#btnSalvaModPaz").on("click", modPaz);
});

function gestInvioPazienti(){
    let elencoPazienti = sendRequestNoCallback("/api/pazienti", "POST", {});
    elencoPazienti.done(function (data) {
        esitoInvioPazienti(data);
    });
    elencoPazienti.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorElimPaz");
    });
}

function esitoInvioPazienti(jsonRic) {
    let vetAus;
    $("#corpoTabPazienti").html("");
    jsonRic.forEach(paziente => {
        vetAus = $("#rigaPaziente_" + paziente["_id"]).find("td");
        riga = $("<tr></tr>");
        riga.attr("id", "rigaPaziente_" + paziente["_id"]);
        let aus = "";
        for (let campo in paziente) {
            if (campo != "pwd") {
                colonna = $("<td></td>");
                aus = paziente[campo];
                colonna.html(aus);
                riga.append(colonna);
            }
        }
        colonna = $("<td></td>");
        colonna.addClass("ultimaCella");
        colonna.html('<div class="row"><div class="col-lg-9 mx-auto"><button type="button" id="btnEliminaPaz_' + paziente["_id"] + '" onclick="deletePaziente(this);" class="btn btn-danger"><i class="fa fa-trash" aria-hidden="true"></i></button>&nbsp;' +
            '<button type="button" id="btnModificaPaz_' + paziente["_id"] + '" onclick="loadDatiModPaz(this);" class="btn btn-success"><i class="fas fa-edit" aria-hidden="true"></i></i></button>' +
            '</div></div>');
        riga.append(colonna);
        $("#corpoTabPazienti").append(riga);
    });
}

function deletePaziente(btn) {
    let idPaziente = parseInt($(btn).attr("id").split('_')[1]);
    let par = {
        "id": idPaziente
    };
    par = JSON.stringify(par);
    let eliminaPazienti = sendRequestNoCallback("/api/eliminaPaziente", "POST", par);
    eliminaPazienti.done(function (data) {
        gestInvioPazienti();
    });
    eliminaPazienti.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorElimPaz");
    });
}

function loadDatiModPaz(btn) {
    let idPaz = parseInt($(btn).attr("id").split('_')[1]);
    let celle = $("#rigaPaziente_" + idPaz).find("td");
    let d = celle[4]["innerText"].split('/')[2] + "-" + celle[4]["innerText"].split('/')[1] + "-" + celle[4]["innerText"].split('/')[0];
    $("#txtModNomePaz").val(celle[1]["innerText"]);
    $("#txtModCognPaz").val(celle[2]["innerText"]);
    $("#txtModCittaPaz").val(celle[3]["innerText"]);
    $("#txtModDatNasPaz").val(d);
    $("#txtModTelPaz").val(parseInt(celle[5]["innerText"]));
    $("#txtModMailPaz").val(celle[6]["innerText"]);
    $("#txtModUserPaz").val(celle[7]["innerText"]);
    idPazGlobal = parseInt(celle[0]["innerText"]);
    $("#modalModPaziente").modal("show");
}

function modPaz() {
    if ($("#txtModNomePaz").val() != "") {
        if ($("#txtModCognPaz").val() != "") {
            if ($("#txtModCittaPaz").val() != "") {
                if (Date.parse($("#txtModDatNasPaz").val())) {
                    if ($("#txtModTelPaz").val().length == 11 && !(isNaN($("#txtModTelPaz").val()))) {
                        if ($("#txtModMailPaz").val().includes("@")) {
                            if ($("#txtModUserPaz").val() != "") {
                                let dataNascita = $("#txtModDatNasPaz").val().split('-')[2] + "/" + $("#txtModDatNasPaz").val().split('-')[1] + "/" + $("#txtModDatNasPaz").val().split('-')[0];
                                let par = {
                                    "id": idPazGlobal,
                                    "nome": $("#txtModNomePaz").val(),
                                    "cognome": $("#txtModCognPaz").val(),
                                    "citta": $("#txtModCittaPaz").val(),
                                    "data": dataNascita,
                                    "telefono": $("#txtModTelPaz").val(),
                                    "mail": $("#txtModMailPaz").val(),
                                    "user": $("#txtModUserPaz").val()
                                };
                                par = JSON.stringify(par);
                                if (idPazGlobal != -1) {
                                    let modPazienti = sendRequestNoCallback("/api/modificaPaziente", "POST", par);
                                    modPazienti.done(function (data) {
                                        $("#pErrorModPaz").val("");
                                        $("#modalModPaziente").modal("hide");
                                        gestInvioPazienti();
                                    });
                                    modPazienti.fail(function (jqXHR) {
                                        printErrors(jqXHR, "pErrorModPaz");
                                    });
                                }
                            } else {
                                $("#pErrorModPaz").show();
                                $("#pErrorModPaz").html("Inserire uno Username Valido");
                            }
                        } else {
                            $("#pErrorModPaz").show();
                            $("#pErrorModPaz").html("L' Indirizzo Mail deve contenere la @");
                        }
                    }else{
                        $("#pErrorModPaz").show();
                        $("#pErrorModPaz").html("Il numero di telefono deve essere di 11 cifre");
                    }
                    
                }else{
                    $("#pErrorModPaz").show();
                    $("#pErrorModPaz").html("Inserire una Data Valida");
                }
            }else{
                $("#pErrorModPaz").show();
                $("#pErrorModPaz").html("Inserire una Città Valida");
            }
        }else{
            $("#pErrorModPaz").show();
            $("#pErrorModPaz").html("Inserire un Cognome Valido");
        }
    }else{
        $("#pErrorModPaz").show();
        $("#pErrorModPaz").html("Inserire un Nome Valido");
    }
}