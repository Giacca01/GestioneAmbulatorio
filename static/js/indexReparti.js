let idRepGlobal = -1;
let adminGlobal = false;
let tipoUtGlobal = "";

$(document).ready(function () {
    $("#btnAddRep").on("click", chkDatiRep);
    $("#btnSalvaModRep").on("click", modRep);

    let chkToken = inviaRichiesta('/api/chkToken', 'POST', {});
    chkToken.fail(function (jqXHR, test_status, str_error) {
        printErrors(jqXHR, "pErrorElReparti");
    });
    chkToken.done(function (data) {
        adminGlobal = data.admin;
        tipoUtGlobal = data.tipoUt;
        if (data.admin == false) {
            $("#sezAggRep").remove();
            $('#navPaz').remove();
            $('a[name ="navSoloMedici"]').remove();
        }

        if (data.tipoUt == "PAZIENTE") {
            $('a[name ="navSoloMedici"]').remove();
        }
    });

    invioElRep();
});

function gestAggOk() {
    invioElRep();
    $("#txtNomeAddRep").val("");
    $("#txtDescAddRep").val("");
}

function invioElRep() {
    let elencoReparti = inviaRichiesta('/api/elReparti', 'POST', {});
    elencoReparti.fail(function (jqXHR, test_status, str_error) {
        printErrors(jqXHR, "pErrorElReparti");
    });
    elencoReparti.done(function (data) {
        esitoInvioElRep(data);
    });
}

function esitoInvioElRep(jsonRic) {
    $("#v-pills-tab").html("");
    $("#v-pills-tabContent").html("");
    let codHtmlTab = "";
    let I = 0;
    let codHtmlTabContent = "";
    jsonRic.forEach(reparto => {
        if (I == 0) {
            codHtmlTab += '<a class="nav-link px-4 active" id="v-pills-' + reparto["nome"] + '-tab" data-toggle="pill" href = "#v-pills-' + reparto["nome"] + '" role = "tab" aria-controls="v-pills-' + reparto["nome"] + '" aria-selected="true" >';
        }else{
            codHtmlTab += '<a class="nav-link px-4" id="v-pills-' + reparto["nome"] + '-tab" data-toggle="pill" href = "#v-pills-' + reparto["nome"] + '" role = "tab" aria-controls="v-pills-' + reparto["nome"] + '" aria-selected="false" >';
        }
        codHtmlTab += '<span class="mr-3 flaticon-stethoscope"></span> ' + reparto["nome"]+'</a >';
        
        if (I == 0) {
            codHtmlTabContent += '<div class="tab-pane show active py-5" id="v-pills-' + reparto["nome"] + '" role="tabpanel" aria-labelledby="v-pills-' + reparto["nome"] + '-tab">';
        }else{
            codHtmlTabContent += '<div class="tab-pane py-5" id="v-pills-' + reparto["nome"] + '" role="tabpanel" aria-labelledby="v-pills-' + reparto["nome"] + '-tab">';
        }
        I++;
        codHtmlTabContent += '<span class="icon mb-3 d-block flaticon-stethoscope"></span>';
        codHtmlTabContent += '<h2 id="nomeReparto_' + reparto["_id"]+'" class="mb-4">' + reparto["nome"]+'</h2>';
        codHtmlTabContent += '<p id="descReparto_' + reparto["_id"]+'">' + reparto["descrizione"]+'</p>';

        if (adminGlobal == true && tipoUtGlobal == "MEDICO") {
            codHtmlTabContent += "<div class='row'><div class='col-lg-6'><button id='btnElReparto_" + reparto["_id"] + "' onclick='deleteReparto(this);' class='btn btn-danger btn-lg btn-block'><i class='fa fa-trash' aria-hidden='true'></i>Elimina</button></div>";
            codHtmlTabContent += "<div class='col-lg-6'><button id='btnModReparto_" + reparto["_id"] + "' onclick='loadDatiModRep(this);' class='btn btn-success btn-lg btn-block'><i class='fa fa-edit' aria-hidden='true'></i>Modifica</button></div><div class='col-lg-4'></div></div>";
        }
        codHtmlTabContent += "</div>";
        $("#v-pills-tab").html(codHtmlTab);
        $("#v-pills-tabContent").html(codHtmlTabContent);
    });
}

function deleteReparto(btn) {
    let idReparto = parseInt($(btn).attr("id").split('_')[1]);
    console.log(idReparto);
    let par = {
        "id": idReparto
    };
    par = JSON.stringify(par);
    let delRep = sendRequestNoCallback("/api/eliminaReparto", "POST", par);
    delRep.done(function (data) {
        invioElRep();
    });
    delRep.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorElReparti");
    });
}

function chkDatiRep() {
    if ($("#txtNomeAddRep").val() != "") {
        if ($("#txtDescAddRep").val() != "") {
            $("#pErrorAddReparti").hide();
            let par = {
                "nome": $("#txtNomeAddRep").val(),
                "descrizione": $("#txtDescAddRep").val(),
            }
            par = JSON.stringify(par);
            let addRep = sendRequestNoCallback("/api/addRep", "POST", par);
            addRep.done(function (data) {
                gestAggOk();
            });
            addRep.fail(function (jqXHR) {
                printErrors(jqXHR, "pErrorAddReparti");
            });
        } else {
            $("#pErrorAddReparti").show();
            $("#pErrorAddReparti").html("Inserire una Descrizione valida");
        }
    }else{
        $("#pErrorAddReparti").show();
        $("#pErrorAddReparti").html("Inserire un Nome valido");
    }
}

function loadDatiModRep(btn) {
    let idRep = parseInt($(btn).attr("id").split('_')[1]);
    $("#txtNomeModRep").val($("#nomeReparto_"+idRep).text());
    $("#txtDescModRep").val($("#descReparto_" + idRep).text());
    idRepGlobal = idRep;
    $("#modalModRep").modal("show");
}

function modRep() {
    if ($("#txtNomeModRep").val() != "") {
        if ($("#txtDescModRep").val() != "") {
            let par = {
                "id": idRepGlobal,
                "nome": $("#txtNomeModRep").val(),
                "descrizione": $("#txtDescModRep").val()
            };
            par = JSON.stringify(par);
            if (idRepGlobal != -1) {
                let modReparto = sendRequestNoCallback("/api/modificaRep", "POST", par);
                modReparto.done(function (data) {
                    $("#pErrorModalRep").val("");
                    $("#modalModRep").modal("hide");
                    invioElRep();
                });
                modReparto.fail(function (jqXHR) {
                    printErrors(jqXHR, "pErrorModalRep");
                });
            }
        } else {
            $("#pErrorModalRep").show();
            $("#pErrorModalRep").html("Inserire una Descrizione Valida");
        }
    }else{
        $("#pErrorModalRep").show();
        $("#pErrorModalRep").html("Inserire un Nome Valido");
    }
}