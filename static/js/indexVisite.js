let idVisitaGlobal = -1;
let dataModGlobal = "";
let tipoUtGlobal = "";

$(document).ready(function () {
    let chkToken = inviaRichiesta('/api/chkToken', 'POST', {});
    chkToken.fail(function (jqXHR, test_status, str_error) {
        printErrors(jqXHR, "pErrorGrafici");
    });
    chkToken.done(function (data) {
        tipoUtGlobal = data.tipoUt;
        if (data.admin == false) {
            $('#navPaz').remove();
            $('a[name ="navSoloMedici"]').remove();
        }

        if (data.tipoUt == "MEDICO") {
            $("#contTitoloPrenVisita").remove();
            $("#contPrenVisita").remove();
            let elMediciMod = sendRequestNoCallback("/api/elMedici", "POST", {});
            elMediciMod.done(function (data) {
                esitoInvioElMedici(data, "listMedicoModVisita");
            });
            elMediciMod.fail(function (jqXHR) {
                printErrors(jqXHR, "pErrorElModVisite");
            });
            let elRepMod = sendRequestNoCallback("/api/elReparti", "POST", {});
            elRepMod.done(function (data) {
                esitoInvioElReparti(data, "listRepartoModVisita");
            });
            elRepMod.fail(function (jqXHR) {
                printErrors(jqXHR, "pErrorElModVisite");
            });
            let elPazMod = sendRequestNoCallback("/api/elPaz", "POST", {});
            elPazMod.done(function (data) {
                esitoInvioElMedici(data, "listPazienteModVisita");
            });
            elPazMod.fail(function (jqXHR) {
                printErrors(jqXHR, "pErrorElModVisite");
            });
            let elTipiPagMod = sendRequestNoCallback("/api/elTipiPag", "POST", {});
            elTipiPagMod.done(function (data) {
                esitoInvioElReparti(data, "listTipoPagModVisita");
            });
            elTipiPagMod.fail(function (jqXHR) {
                printErrors(jqXHR, "pErrorElModVisite");
            });
            setOre("listOrariModVisita");
            $("#txtDataModVisita").on("change", function () {
                setOre("listOrariModVisita");
                if (dataModGlobal != $("#txtDataModVisita").val()) {
                    if (Date.parse($("#txtDataModVisita").val())) {
                        invioOrari("#txtDataModVisita", "#listMedicoModVisita", "pErrorElModVisite", "listOrariModVisita");
                    }
                }
            });
            $("#listMedicoModVisita").on("change", function () {
                setOre("listOrariModVisita");
                if (dataModGlobal != $("#txtDataModVisita").val()) {
                    if (Date.parse($("#txtDataModVisita").val())) {
                        invioOrari("#txtDataModVisita", "#listMedicoModVisita", "pErrorElModVisite", "listOrariModVisita");
                    }
                }
            });
        } else {
            $('a[name ="navSoloMedici"]').remove();
            let elMediciAdd = sendRequestNoCallback("/api/elMedici", "POST", {});
            elMediciAdd.done(function (data) {
                esitoInvioElMedici(data, "listMedicoAddVisita");
            });
            elMediciAdd.fail(function (jqXHR) {
                printErrors(jqXHR, "pErrorAddVisita");
            });
            let elRepAdd = sendRequestNoCallback("/api/elReparti", "POST", {});
            elRepAdd.done(function (data) {
                esitoInvioElReparti(data, "listRepartoAddVisita");
            });
            elRepAdd.fail(function (jqXHR) {
                printErrors(jqXHR, "pErrorAddVisita");
            });
            setOre("listOrariAddVisita");
            $("#txtDataAddVisita").on("change", function () {
                setOre("listOrariAddVisita");
                if (Date.parse($("#txtDataAddVisita").val())) {
                    invioOrari("#txtDataAddVisita", "#listMedicoAddVisita", "pErrorAddVisita", "listOrariAddVisita");
                }
            });
            $("#listMedicoAddVisita").on("change", function () {
                setOre("listOrariAddVisita");
                if (Date.parse($("#txtDataAddVisita").val())) {
                    invioOrari("#txtDataAddVisita", "#listMedicoAddVisita", "pErrorAddVisita", "listOrariAddVisita");
                }
            });
        }
    });
   
    gestInvioVisite();
    setMinDate();
    $("#btnAddVisita").on("click", chkDatiVisita);
    $("#btnSalvaModVisita").on("click", modVisita);
});

function invioOrari(data, medico, err , list) {
    let dataVisita = $(data).val().split('-')[2] + "/" + $(data).val().split('-')[1] + "/" + $(data).val().split('-')[0];
    let orariVisitaAdd = sendRequestNoCallback("/api/orariVisite", "POST", JSON.stringify({ "data": dataVisita, "medico": $(medico).val() }));
    orariVisitaAdd.done(function (data) {
        gestInvioOrari(data, list);
    });
    orariVisitaAdd.fail(function (jqXHR) {
        printErrors(jqXHR, err);
    });
}

function setMinDate() {
    let today = new Date().toISOString().split('T')[0];
    $("#txtDataAddVisita").attr("min", today);
}

function setOre(listId) {
    let option;
    let ora = "";
    $("#" + listId).html("");
    for (let i = 9; i < 19; i++) {
        ora = i + ":00";
        option = $("<option></option>");
        option.val(ora);
        option.html(ora);
        $("#" + listId).append(option);
    }
    if (listId != "listOrariModVisita") {
        document.getElementById(listId).selectedIndex = -1;
    }
}

function gestInvioOrari(jsonRic, listId) {
    jsonRic.forEach(ora => {
        option = $("<option></option>");
        if ($("#" + listId + " option[value='" + ora["ora"] + "']").length > 0) {
            $("#" + listId + " option[value='" + ora["ora"] + "']").remove();
        }
    });
    if (listId != "listOrariModVisita") {
        document.getElementById(listId).selectedIndex = -1;
    }else{

    }
}

function gestInvioVisite() {
    let invioVisite = sendRequestNoCallback("/api/visite", "POST", {});
    invioVisite.done(function (data) {
        esitoInvioVisite(data);
    });
    invioVisite.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorElModVisite");
    });
}

function esitoInvioVisite(jsonRic) {
    $("#corpoTabVisite").html("");
    jsonRic.forEach(visita => {
        riga = $("<tr></tr>");
        riga.attr("id", "rigaVisite_" + visita["_id"]);
        for (let campo in visita) {
            colonna = $("<td></td>");
            aus = visita[campo];
            if (campo == "medicinali") {
                let testo = "";
                for (let i = 0; i < campo.length; i++) {
                    if (visita[campo][i] != undefined) {
                        testo += visita[campo][i] + "-";
                    }
                }
                colonna.html(testo.substr(0, testo.length - 1));
            } else if (campo == "elMed"){
                colonna.html(visita["elMed"][0].nome + " " + visita["elMed"][0].cognome);
                riga.attr("codMedico", visita["elMed"][0]._id);
            } else if (campo == "elRep"){
                colonna.html(visita["elRep"][0].nome);
                riga.attr("codRep", visita["elRep"][0]._id);
            }
            else {
                colonna.html(visita[campo]);
            }
            riga.append(colonna);
        }
        colonna = $("<td></td>");
        colonna.addClass("ultimaCella");
        if (tipoUtGlobal == "MEDICO") { // se è medico metto i bottoni per togliere/aggiungere
            colonna.html('<div class="row"><div class="col-lg-9 mx-auto"><button type="button" id="btnEliminaVisita_' + visita["_id"] + '" onclick="deleteVisita(this);" class="btn btn-danger"><i class="fa fa-trash" aria-hidden="true"></i></button>&nbsp;' +
                '<button type="button" id="btnModificaVisita_' + visita["_id"] + '" onclick="loadDatiModVisita(this);" class="btn btn-success"><i class="fas fa-edit" aria-hidden="true"></i></i></button>' +
                '</div></div>');
        } else {
            colonna.html('&nbsp;');
        }

        riga.append(colonna);
        $("#corpoTabVisite").append(riga);
    });
}


function deleteVisita(btn) {
    let idVisita = parseInt($(btn).attr("id").split('_')[1]);
    console.log(idVisita);
    let par = {
        "id": idVisita
    };
    par = JSON.stringify(par);
    let delVisita = sendRequestNoCallback("/api/eliminaVisita", "POST", par);
    delVisita.done(function (data) {
        gestInvioVisite();
    });
    delVisita.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorElModVisite");
    });
}

function esitoInvioElMedici(jsonRic, listId) {
    jsonRic.forEach(medico => {
        option = $("<option></option>");
        if (!$("#" + listId+" option[value=" + medico["_id"] + "]").length > 0) {
            option.val(medico["_id"]);
            option.html(medico["nome"] + " " + medico["cognome"]);
            $("#"+listId).append(option);
        }
    });
    document.getElementById(listId).selectedIndex = -1;
}

function esitoInvioElReparti(jsonRic, listId) {
    let option = $("<option></option>");
    option.val("nonPagato");
    option.html("-");
    $("#" + listId).append(option);
    jsonRic.forEach(reparto => {
        option = $("<option></option>");
        if (!$("#" + listId+" option[value=" + reparto["_id"] + "]").length > 0) {
            option.val(reparto["_id"]);
            option.html(reparto["nome"]);
            $("#" + listId).append(option);
        }
    });
    document.getElementById(listId).selectedIndex = -1;
}

function chkDatiVisita() {
    if (document.getElementById("listMedicoAddVisita").selectedIndex != -1) {
        if (document.getElementById("listRepartoAddVisita").selectedIndex != -1) {
            if (document.getElementById("listOrariAddVisita").selectedIndex != -1) {
                if (Date.parse($("#txtDataAddVisita").val())) {
                    $("#pErrorAddVisita").hide();
                    let dataVisita = $("#txtDataAddVisita").val().split('-')[2] + "/" + $("#txtDataAddVisita").val().split('-')[1] + "/" + $("#txtDataAddVisita").val().split('-')[0];
                    let par = {
                        "medico": $("#listMedicoAddVisita").val(),
                        "reparto": $("#listRepartoAddVisita").val(),
                        "data": dataVisita,
                        "ora": $("#listOrariAddVisita").val()
                    }
                    par = JSON.stringify(par);
                    let addVisita = sendRequestNoCallback("/api/addVisita", "POST", par);
                    addVisita.done(function (data) {
                        gestAggOk();
                    });
                    addVisita.fail(function (jqXHR) {
                        printErrors(jqXHR, "pErrorAddVisita");
                    });
                } else {
                    $("#pErrorAddVisita").show();
                    $("#pErrorAddVisita").html("Inserire una Data valida");
                }
            }else{
                $("#pErrorAddVisita").show();
                $("#pErrorAddVisita").html("Inserire un' Ora valida");
            }
        }else{
            $("#pErrorAddVisita").show();
            $("#pErrorAddVisita").html("Selezionare un Reparto");
        }
    }else{
        $("#pErrorAddVisita").show();
        $("#pErrorAddVisita").html("Selezionare un Medico");
    }
}

function gestAggOk() {
    gestInvioVisite();
    let today = new Date();
    let dd = ("0" + (today.getDate())).slice(-2);
    let mm = ("0" + (today.getMonth() + 1)).slice(-2);
    let yyyy = today.getFullYear();
    today = yyyy + '-' + mm + '-' + dd;
    $("#txtDataAddVisita").val(toString(today));
    document.getElementById("listMedicoAddVisita").selectedIndex = -1;
    document.getElementById("listRepartoAddVisita").selectedIndex = -1;
    document.getElementById("listOrariAddVisita").selectedIndex = -1;
}

function loadDatiModVisita(btn) {
    idVista = parseInt($(btn).attr("id").split('_')[1]);
    let celle = $("#rigaVisite_" + idVista).find("td");
    let d = celle[1]["innerText"].split('/')[2] + "-" + celle[1]["innerText"].split('/')[1] + "-" + celle[1]["innerText"].split('/')[0];
    dataModGlobal = d;
    $("#listOrariModVisita").val(celle[2]["innerText"]);
    $("#txtImportoModVisita").val(parseInt(celle[4]["innerText"]));
    if (celle[5]["innerText"] == "SI") {
        $("#txtPagatoModVisita").prop("checked", true);
        $("#listTipoPagModVisita").val(parseInt(celle[6]["innerText"]));
    }else{
        $("#txtPagatoModVisita").prop("checked", false);
        document.getElementById("listTipoPagModVisita").selectedIndex = -1
    }
    $("#txtMedicinaliModVisita").val(celle[7]["innerText"]);
    $("#txtDataModVisita").val(d);
    $("#listRepartoModVisita").val($("#rigaVisite_" + idVista).attr("codrep"));
    $("#listMedicoModVisita").val($("#rigaVisite_" + idVista).attr("codmedico"));
    $("#listPazienteModVisita").val(parseInt(celle[3]["innerText"]));
    idVisitaGlobal = parseInt(celle[0]["innerText"]);
    $("#modalModVisita").modal("show");
}

function modVisita(){
    let esito = false
    let pagato = "";
    let tipoPag;
    if (Date.parse($("#txtDataModVisita").val())) {
        if ($('#txtPagatoModVisita').is(':checked')) {
            pagato = "SI";
            if (parseInt($("#txtImportoModVisita").val()) > 0) {
                if (document.getElementById("listTipoPagModVisita").selectedIndex != -1 && $("#listTipoPagModVisita").val() != "nonPagato") {
                    esito = true;
                }else{
                    esito = false;
                    $("#pErrorModVisita").show();
                    $("#pErrorModVisita").html("Inserire un Metodo di Pagamento");
                }
                
            }else{
                esito = false;
                $("#pErrorModVisita").show();
                $("#pErrorModVisita").html("Inserire un Importo Valido");
            }
        }else{
            pagato = "NO";
            if ($("#txtImportoModVisita").val() == "") {
                if ($("#listTipoPagModVisita").val() == "nonPagato" || document.getElementById("listTipoPagModVisita").selectedIndex == -1) {
                    esito = true;
                }else{
                    esito = false;
                    $("#pErrorModVisita").show();
                    $("#pErrorModVisita").html("Occorre selezionare l'opzione Pagato");
                }
            }else{
                esito = false;
                $("#pErrorModVisita").show();
                $("#pErrorModVisita").html("Occorre selezionare l'opzione Pagato");
            }
        }
    }else{
        $("#pErrorModVisita").show();
        $("#pErrorModVisita").html("Inserire una Data Valida");
        esito = false;
    }

    if (esito) {
        if ($("#listTipoPagModVisita").val() == "nonPagato") {
            tipoPag = "";
        }else{
            tipoPag = $("#listTipoPagModVisita").val();
        }
        $("#pErrorModVisita").html("");
        let dataVisita = $("#txtDataModVisita").val().split('-')[2] + "/" + $("#txtDataModVisita").val().split('-')[1] + "/" + $("#txtDataModVisita").val().split('-')[0];
        let par = {
            "id": idVisitaGlobal,
            "reparto": $("#listRepartoModVisita").val(),
            "medico": $("#listMedicoModVisita").val(),
            "data": dataVisita,
            "ora": $("#listOrariModVisita").val(),
            "paziente": $("#listPazienteModVisita").val(),
            "importo": $("#txtImportoModVisita").val(),
            "pagato": pagato,
            "tipo_pagamento": tipoPag,
            "medicinali": $("#txtMedicinaliModVisita").val()
        };
        par = JSON.stringify(par);
        console.log(par);
        if (idVisitaGlobal != -1) {
            let modVisita = sendRequestNoCallback("/api/modificaVisita", "POST", par);
            modVisita.done(function (data) {
                $("#modalModVisita").modal("hide");
                gestInvioVisite();
            });
            modVisita.fail(function (jqXHR) {
                printErrors(jqXHR, "pErrorModVisita");
            });
        }
    }
}