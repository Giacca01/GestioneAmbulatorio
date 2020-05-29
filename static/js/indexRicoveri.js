let idRicovero = -1;
let tipoUtGlobal = "";
$(document).ready(function () {
    let chkToken = inviaRichiesta('/api/chkToken', 'POST', {});
    chkToken.fail(function (jqXHR, test_status, str_error) {
        printErrors(jqXHR, "pErrorElModRic");
    });
    chkToken.done(function (data) {
        tipoUtGlobal = data.tipoUt;
        
        if (data.admin == false) {
            $('#navPaz').remove();
            $('a[name ="navSoloMedici"]').remove();
        }
        if (data.tipoUt == "PAZIENTE") {
            $('a[name ="navSoloMedici"]').remove();
            $("#contTitoloAggRic").remove();
            $("#contAggRic").remove();
        } else {
            let invioPazmedico = inviaRichiesta('/api/elPazMedico', 'POST', {});
            invioPazmedico.fail(function (jqXHR, test_status, str_error) {
                printErrors(jqXHR, "pErrorElModRic");
            });
            invioPazmedico.done(function (data) {
                esitoInvioElPaz(data);
            });
        }
    });
    gestInvioRicoveri();
    $("#btnAggRicovero").on("click", chkDatiAggRic);
    $("#btnSalvaModRicovero").on("click", modRicovero);
});

function gestInvioRicoveri() {
    let invioRicoveri = inviaRichiesta('/api/ricoveri', 'POST', {});
    invioRicoveri.fail(function (jqXHR, test_status, str_error) {
        printErrors(jqXHR, "pErrorElModRic");
    });
    invioRicoveri.done(function (data) {
        esitoInvioRicoveri(data);
    });
}


function esitoInvioRicoveri(obj) {
    let jsonRic = obj;
    $("#corpoTabRicoveri").html("");
    jsonRic.forEach(ricovero => {
        riga = $("<tr></tr>");
        riga.attr("id", "rigaRicovero_" + ricovero["_id"]);
        let aus = "";
        for (let campo in ricovero) {
            colonna = $("<td></td>");
            aus = ricovero[campo];
            colonna.html(aus);
            riga.append(colonna);
        }
        colonna = $("<td></td>");
        colonna.addClass("ultimaCella");
        if (tipoUtGlobal == "MEDICO") {
            colonna.html('<div class="row"><div class="col-lg-9 mx-auto"><button type="button" id="btnEliminaRic_' + ricovero["_id"] + '" onclick="deleteRicovero(this);" class="btn btn-danger"><i class="fa fa-trash" aria-hidden="true"></i></button>&nbsp;' +
                '<button type="button" id="btnModificaRic_' + ricovero["_id"] + '" onclick="loadDatiModRic(this);" class="btn btn-success"><i class="fas fa-edit" aria-hidden="true"></i></i></button>' +
                '</div></div>');
        } else {
            colonna.html('&nbsp;');
        }
        riga.append(colonna);
        $("#corpoTabRicoveri").append(riga);
    });
}

function esitoInvioElPaz(obj) {
    let jsonRic = obj;
    jsonRic.forEach(paziente => {
        option = $("<option></option>");
        if (!$("#listPazRic option[value=" + paziente["elPaz"][0]._id+"]").length > 0) {
            option.val(paziente["elPaz"][0]._id);
            option.html(paziente["elPaz"][0].nome + " " + paziente["elPaz"][0].cognome);
            $("#listPazRic").append(option);
        }
    });
    document.getElementById("listPazRic").selectedIndex = -1;
}

function chkDatiAggRic() {
    if (document.getElementById("listPazRic").selectedIndex != -1) {
        if ($("#txtAnnoRicovero").val().length == 4) {
            if ($("#txtOspRicovero").val() != "") {
                if ($("#txtDurataRicovero").val() >= 1) {
                    $("#pErrorAggRic").hide();
                    let par = {
                        "anno": $("#txtAnnoRicovero").val(),
                        "ospedale": $("#txtOspRicovero").val(),
                        "durata": $("#txtDurataRicovero").val(),
                        "paz": $("#listPazRic").val()
                    };
                    par = JSON.stringify(par);
                    let addRicovero = sendRequestNoCallback("/api/aggRicovero", "POST", par);
                    addRicovero.done(function (data) {
                        gestAggOk();
                    });
                    addRicovero.fail(function (jqXHR) {
                        printErrors(jqXHR, "pErrorAggRic");
                    });
                }else{
                    $("#pErrorAggRic").show();
                    $("#pErrorAggRic").html("La Durata deve essere pari o superiore ad 1");
                }
            }else{
                $("#pErrorAggRic").show();
                $("#pErrorAggRic").html("Inserire un Ospedale valido");
            }
        }else{
            $("#pErrorAggRic").show();
            $("#pErrorAggRic").html("Inserire un Anno valido");
        }
    }else{
        $("#pErrorAggRic").show();
        $("#pErrorAggRic").html("Selezionare un Paziente");
    }
}

function gestAggOk() {
    gestInvioRicoveri();
    $("#txtAnnoRicovero").val("");
    $("#txtOspRicovero").val("");
    $("#txtDurataRicovero").val("");
    document.getElementById("listPazRic").selectedIndex = -1;
}

function deleteRicovero(btn) {
    let idRicovero = parseInt($(btn).attr("id").split('_')[1]);
    console.log(idRicovero);
    let par = {
        "id":idRicovero
    };
    par = JSON.stringify(par);
    let delRicovero = sendRequestNoCallback("/api/eliminaRicovero", "POST", par);
    delRicovero.done(function (data) {
        gestInvioRicoveri();
    });
    delRicovero.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorElModRic");
    });
}

function loadDatiModRic(btn) {
    idRicovero = parseInt($(btn).attr("id").split('_')[1]);
    let celle = $("#rigaRicovero_" + idRicovero).find("td");
    $("#txtModAnnoRicovero").val(parseInt(celle[1]["innerText"]));
    $("#txtModOspRicovero").val(celle[2]["innerText"]);
    $("#txtModDurataRicovero").val(parseInt(celle[3]["innerText"]));
    $("#modalModRicovero").modal("show");
}

function modRicovero() {
    if ($("#txtModAnnoRicovero").val().length == 4) {
        if ($("#txtModOspRicovero").val() != "") {
            if (parseInt($("#txtModDurataRicovero").val()) >= 1) {
                let par = {
                    "id": idRicovero,
                    "anno": $("#txtModAnnoRicovero").val(),
                    "ospedale": $("#txtModOspRicovero").val(),
                    "durata": $("#txtModDurataRicovero").val()
                };
                par = JSON.stringify(par);
                if (idRicovero != -1) {
                    let modRicovero = sendRequestNoCallback("/api/modificaRicovero", "POST", par);
                    modRicovero.done(function (data) {
                        $("#modalModRicovero").modal("hide");
                        gestInvioRicoveri();
                    });
                    modRicovero.fail(function (jqXHR) {
                        printErrors(jqXHR, "pErrorModRic");
                    });
                }
            }else{
                $("#pErrorModRic").show();
                $("#pErrorModRic").html("La Durata deve essere pari o superiore ad 1");
            }
        }else{
            $("#pErrorModRic").show();
            $("#pErrorModRic").html("Inserire un Ospedale Valido");
        }
    }else{
        $("#pErrorModRic").show();
        $("#pErrorModRic").html("Inserire un Anno Valido");
    }
}