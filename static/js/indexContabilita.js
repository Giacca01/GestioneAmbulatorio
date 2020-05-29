let idTipoPagGlobal = -1;

$(document).ready(function () {
    let chkToken = inviaRichiesta('/api/chkToken', 'POST', {});
    chkToken.fail(function (jqXHR, test_status, str_error) {
        printErrors(jqXHR, "pErrorGrafici");
    });
    chkToken.done(function (data) {
        if (data.tipoUt == "PAZIENTE" || data.admin == false) {
            window.location = "index.html";
        } else {
            gestInvioTipiPag();
            stampaGraficiPag();
        }
    });
    $("#btnAddTipoPag").on("click", chkDatiTipoPag);
    $("#btnSalvaModTipoPag").on("click", modTipoPag);
});

function gestAggOk() {
    gestInvioTipiPag();
    $("#txtDescAddTipoPag").val("");
}

function gestInvioTipiPag() {
    let elencoTipiPag = sendRequestNoCallback("/api/elTipiPag", "POST", {});
    elencoTipiPag.done(function (data) {
        esitoInvioTipiPag(data);
    });
    elencoTipiPag.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorElModTipiPag");
    });
}

function esitoInvioTipiPag(jsonRic) {
    $("#corpoTabTipiPagamenti").html("");
    jsonRic.forEach(tipoPag => {
        riga = $("<tr></tr>");
        riga.attr("id", "rigaTipoPag_" + tipoPag["_id"]);
        let aus = "";
        for (let campo in tipoPag) {
            colonna = $("<td></td>");
            aus = tipoPag[campo];
            colonna.html(aus);
            riga.append(colonna);
        }
        colonna = $("<td></td>");
        colonna.addClass("ultimaCella");
        colonna.html('<div class="row"><div class="col-lg-9 mx-auto"><button type="button" id="btnEliminaTipoPag_' + tipoPag["_id"] + '" onclick="deleteTipoPag(this);" class="btn btn-danger"><i class="fa fa-trash" aria-hidden="true"></i></button>&nbsp;' +
            '<button type="button" id="btnModificaTipoPag_' + tipoPag["_id"] + '" onclick="loadDatiModTipoPag(this);" class="btn btn-success"><i class="fas fa-edit" aria-hidden="true"></i></i></button>' +
            '</div></div>');
        riga.append(colonna);
        $("#corpoTabTipiPagamenti").append(riga);
    });
}

function stampaGraficiPag() {
    let grafNPag = sendRequestNoCallback("/api/nPagamenti", "POST", {});
    grafNPag.done(function (data) {
        google.charts.load('current', { 'packages': ['corechart'] });
        google.charts.setOnLoadCallback(function () {
            disegnaGraficoNPag(data);
        });
    });
    grafNPag.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorGrafici");
    });

    let grafNUtentiTipoPag = sendRequestNoCallback("/api/nUtentiPagamenti", "POST", {});
    grafNUtentiTipoPag.done(function (data) {
        google.charts.load('current', { 'packages': ['corechart'] });
        google.charts.setOnLoadCallback(function () {
            console.log(data);
            disegnaGraficoNUtentiTipoPag(data);
        });
    });
    grafNUtentiTipoPag.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorGrafici");
    });
}

// Disegno Grafico Numero Visite Pagate
function disegnaGraficoNPag(jsonRic) {
    let vetAus = new Array();
    let array = [];
    // Do il nome alle colonne di appoggio
    array[0] = "NumeroPagamenti";
    array[1] = "Prova";
    vetAus.push(array);
    jsonRic.forEach(elem => {
        array = new Array();
        array[0] = elem["_id"];
        array[1] = parseInt(elem["totale"]);
        vetAus.push(array);
    });
    // Accetta un vettore con dentro un vettore con i dati da mettere sul grafico (uno per ogni grafico)
    var datiGrafico = google.visualization.arrayToDataTable(vetAus);
    // Imposto titolo e dimensioni (non prende le %)
    var options = { 'title': 'Visite pagate', 'width': 550, 'height': 400 };
    // Mostro il div
    var chart = new google.visualization.PieChart(document.getElementById('graficoVisitePagate'));
    chart.draw(datiGrafico, options);
}

// Disegno Grafico Numero di Pagamenti per ogni tipo pagamento
function disegnaGraficoNUtentiTipoPag(jsonRic) {
    let vetAus = new Array();
    let array = [];
    array[0] = "NumeroTipoPagamenti";
    array[1] = "Prova";
    vetAus.push(array);
    jsonRic.forEach(elem => {
        if (elem["tipoPag"][0] != undefined) {
            array = new Array();
            array[0] = elem["tipoPag"][0].nome;
            array[1] = parseInt(elem["totale"]);
            vetAus.push(array);
        }
    });
    console.log(vetAus);
    var datiGrafico = google.visualization.arrayToDataTable(vetAus);
    var options = { 'title': 'Numero di utilizzi Metodi di Pagamento', 'width': 550, 'height': 400 };
    var chart = new google.visualization.PieChart(document.getElementById('graficoNumUtentiPag'));
    chart.draw(datiGrafico, options);
}

function deleteTipoPag(btn) {
    let idTipoPag = parseInt($(btn).attr("id").split('_')[1]);
    console.log(idTipoPag);
    let par = {
        "id": idTipoPag
    };
    par = JSON.stringify(par);
    let delTipoPag = sendRequestNoCallback("/api/eliminaTipoPag", "POST", par);
    delTipoPag.done(function (data) {
        gestInvioTipiPag();
        stampaGraficiPag();
    });
    delTipoPag.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorElModTipiPag");
    });
}

function chkDatiTipoPag() {
    if ($("#txtDescAddTipoPag").val() != "") {
        $("#pErrorElModTipiPag").hide();
        let par = {
            "nome": $("#txtDescAddTipoPag").val()
        }
        par = JSON.stringify(par);
        let addTipoPag = sendRequestNoCallback("/api/addTipoPag", "POST", par);
        addTipoPag.done(function (data) {
            gestAggOk();
            stampaGraficiPag();
        });
        addTipoPag.fail(function (jqXHR) {
            printErrors(jqXHR, "pErrorElModTipiPag");
        });
    } else {
        $("#pErrorAddTipiPag").show();
        $("#pErrorAddTipiPag").html("Inserire una Descrizione valida");
    }
}

function loadDatiModTipoPag(btn) {
    let idTipoPag = parseInt($(btn).attr("id").split('_')[1]);
    let celle = $("#rigaTipoPag_" + idTipoPag).find("td");
    $("#txtDescModTipoPag").val(celle[1]["innerText"]);
    idTipoPagGlobal = parseInt(celle[0]["innerText"]);
    $("#modalModTipoPag").modal("show");
}

function modTipoPag() {
    if ($("#txtDescModTipoPag").val() != "") {
        let par = {
            "id": idTipoPagGlobal,
            "nome": $("#txtDescModTipoPag").val()
        };
        par = JSON.stringify(par);
        if (idTipoPagGlobal != -1) {
            let modTipoPag = sendRequestNoCallback("/api/modificaTipoPag", "POST", par);
            modTipoPag.done(function (data) {
                $("#pErrorModalTipiPag").val("");
                $("#modalModTipoPag").modal("hide");
                gestInvioTipiPag();
                stampaGraficiPag();
            });
            modTipoPag.fail(function (jqXHR) {
                printErrors(jqXHR, "pErrorModalTipiPag");
            });
        }
    } else {
        $("#pErrorModalTipiPag").show();
        $("#pErrorModalTipiPag").html("Inserire una Descrizione Valida");
    }
}