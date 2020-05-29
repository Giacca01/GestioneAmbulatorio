let idMedicoGlobal = -1;
let adminGlobal = false;
let tipoUtGlobal = "";

$(document).ready(function () {
    $("#btnAddDot").on("click", chkDatiDot);
    $("#btnSalvaModMedico").on("click", modDottore);
    gestInvioElDottori();

    let chkToken = inviaRichiesta('/api/chkToken', 'POST', {});
    chkToken.fail(function (jqXHR, test_status, str_error) {
        printErrors(jqXHR, "pErrorElDottori");
    });
    chkToken.done(function (data) {
        adminGlobal = data.admin;
        tipoUtGlobal = data.tipoUt;
        
        if (data.admin == false) {
            $("#sezAggDot").remove();
            $('#navPaz').remove();
            $('a[name ="navSoloMedici"]').remove();
        }

        if (data.tipoUt == "PAZIENTE") {
            $('a[name ="navSoloMedici"]').remove();
        }
    });
});

function gestInvioElDottori() {
    let elencoDottori = sendRequestNoCallback("/api/elMedici", "POST", {});
    elencoDottori.done(function (data) {
        caricaDottori(data);
    });
    elencoDottori.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorElDottori");
    });
}

function caricaDottori(jsonRic) {
    $("#contCardDottori").html("");
    let html = "";
    jsonRic.forEach(dottore => {
        html += '<div class="col-md-6 col-lg-4 ftco-animate fadeInUp ftco-animated">';
        html += '<div class="block-2">';
        html += '<div class="flipper">';
        html += '<div id="imgDottore_' + dottore["_id"] + '" class="front" style="background-image: url(' + dottore["foto"].replace(/\\/g, "/") + ');">'; //./images/' + dottore["foto"]+'
        html += '<div class="box">';
        html += '<h2><span id="nomeDottore_' + dottore["_id"] + '">' + dottore["nome"] + '</span> <span id="cognDottore_' + dottore["_id"]+'">' + dottore["cognome"]+'</span></h2>';
        html += '<p id="specDottore_' + dottore["_id"]+'">' + dottore["spec"] +'</p></div></div>';
        html += '<div class="back">';
        html += '<blockquote style="padding:2%;">Città:<span id="cittaDottore_' + dottore["_id"] + '">' + dottore["citta"] + '</span><br>Data Nascita:<span id="dataNasDottore_' + dottore["_id"] + '">' + dottore["dataNascita"] + '</span><br>Telefono: <span id="telDottore_' + dottore["_id"] + '">' + dottore["telefono"] + '</span><br>Mail: <span id="mailDottore_' + dottore["_id"]+'">' + dottore["mail"] +"</span>";
        if (dottore["admin"] == "SI") {
            html += '<br>Amministratore: <span id="ammDottore_' + dottore["_id"]+'">' + dottore["admin"] + '</span>'
        }
        if (adminGlobal == true) {
            html += "<br>User: <span id='userDottore_" + dottore["_id"]+"'>" + dottore["user"] +"</span>";
            html += "<div class='row'><div class='col-lg-5'><button id='btnElDottore_" + dottore["_id"] + "' onclick='deleteDottore(this);' class='btn btn-danger btn-md btn-block'><i class='fa fa-trash' aria-hidden='true'></i>Elimina</button></div>";
            html += "<div class='col-lg-5'><button id='btnModDottore_" + dottore["_id"] + "' onclick='loadDatiDot(this);' class='btn btn-success btn-md btn-block'><i class='fa fa-edit' aria-hidden='true'></i>Modifica</button></div><div class='col-lg-2'></div></div>";
        }
        html += '</blockquote>';
        html += '<div class="author d-flex">';
        html += '<div class="image mr-3 align-self-center">';
        html += '<div class="img" style="background-image: url(' + dottore["foto"].replace(/\\/g, "/") + ');"></div></div>'; //url(./images/' + dottore["foto"] +')
        html += '<div class="name align-self-center">' + dottore["nome"] + ' ' + dottore["cognome"] + ' <span class="position">' + dottore["spec"]+'</span></div>';
        html += '</div>';
        html += '</div>';

        html += '</div>';
        html += '</div>';
        html += '</div>';
    });
    $("#contCardDottori").html(html);
}

function gestAggOk() {
    gestInvioElDottori();
    $("#txtNomeAddDot").val("");
    $("#txtCognAddDot").val("");
    $("#txtCittaAddDot").val("");
    $("#txtTelAddDot").val("");
    $("#txtTelAddDot").val("");
    $("#txtMailAddDot").val("");
    $("#txtFotoAddDot").val("");
    $("#txtSpecAddDot").val("");
    $("#txtUserAddDot").val("");
    $("#txtPwdAddDot").val("");
}

function deleteDottore(btn) {
    let idDottore = parseInt($(btn).attr("id").split('_')[1]);
    let par = {
        "id": idDottore
    };
    par = JSON.stringify(par);
    let elDttore = sendRequestNoCallback("/api/eliminaDottore", "POST", par);
    elDttore.done(function (data) {
        gestInvioElDottori();
    });
    elDttore.fail(function (jqXHR) {
        printErrors(jqXHR, "pErrorElDottori");
    });
}

function chkDatiDot() {
    let amm = "NO";
    if ($("#txtAmmAddMedico").prop('checked')) {
        amm = "SI";
    }

    if ($("#txtNomeAddDot").val() != "") {
        if ($("#txtCognAddDot").val() != "") {
            if ($("#txtCittaAddDot").val() != "") {
                if (Date.parse($("#txtDataNasAddDot").val())) {
                    if ($("#txtTelAddDot").val().length == 11 && !(isNaN($("#txtTelAddDot").val()))) {
                        if ($("#txtMailAddDot").val().includes("@ambulatorioGiacardi.com")) {
                            if ($("#txtFotoAddDot").val() != "") {
                                if ($("#txtSpecAddDot").val() != "") {
                                    if ($("#txtUserAddDot").val() != "") {
                                        if ($("#txtPwdAddDot").val() != "") {
                                            $("#pErrorAddDot").hide();
                                            let dataNascita = $("#txtDataNasAddDot").val().split('-')[2] + "/" + $("#txtDataNasAddDot").val().split('-')[1] + "/" + $("#txtDataNasAddDot").val().split('-')[0];
                                            var formData = new FormData();
                                            formData.append('nome', $("#txtNomeAddDot").val());
                                            formData.append('cognome', $("#txtCognAddDot").val());
                                            formData.append('citta', $("#txtCittaAddDot").val());
                                            formData.append('dataNascita', dataNascita);
                                            formData.append('telefono', parseInt($("#txtTelAddDot").val()));
                                            formData.append('mail', $("#txtMailAddDot").val());
                                            formData.append('foto', $('#txtFotoAddDot').prop('files')[0]);
                                            formData.append('spec', $("#txtSpecAddDot").val());
                                            formData.append('amm', amm);
                                            formData.append('user', $("#txtUserAddDot").val());
                                            formData.append('pwd', $("#txtPwdAddDot").val());
                                            let addDttore = inviaRichiestaMultipart("/api/aggiungiDottore", "POST", formData);
                                            addDttore.done(function (data) {
                                                gestAggOk();
                                            });
                                            addDttore.fail(function (jqXHR) {
                                                printErrors(jqXHR, "pErrorAddDot");
                                            });
                                        }else{
                                            $("#pErrorAddDot").show();
                                            $("#pErrorAddDot").html("Inserire la Password del dottore");
                                        }
                                    }else{
                                        $("#pErrorAddDot").show();
                                        $("#pErrorAddDot").html("Inserire il Nome Utente del dottore");
                                    }
                                }else{
                                    $("#pErrorAddDot").show();
                                    $("#pErrorAddDot").html("Inserire la Specializzazione del dottore");
                                }
                            }else{
                                $("#pErrorAddDot").show();
                                $("#pErrorAddDot").html("Inserire la Foto del dottore");
                            }
                        }else{
                            $("#pErrorAddDot").show();
                            $("#pErrorAddDot").html("La mail deve terminare con: @ambulatorioGiacardi.com");
                        }
                    }else{
                        $("#pErrorAddDot").show();
                        $("#pErrorAddDot").html("Il numero di telefono deve essere di 11 cifre");
                    }
                }else{
                    $("#pErrorAddDot").show();
                    $("#pErrorAddDot").html("Inserire una Data di Nascita Valida");
                }            
            }else{
                $("#pErrorAddDot").show();
                $("#pErrorAddDot").html("Inserire una Città valida");
            }
        }else{
            $("#pErrorAddDot").show();
            $("#pErrorAddDot").html("Inserire un Cognome valido");
        }
    } else {
        $("#pErrorAddDot").show();
        $("#pErrorAddDot").html("Inserire un Nome valido");
    }
}

function loadDatiDot(btn) {
    idDot = parseInt($(btn).attr("id").split('_')[1]);
    let d = $("#dataNasDottore_" + idDot).text().split('/')[2] + "-" + $("#dataNasDottore_" + idDot).text().split('/')[1] + "-" + $("#dataNasDottore_" + idDot).text().split('/')[0];
    $("#txtModNomeMedico").val($("#nomeDottore_" + idDot).text());
    $("#txtModCognMedico").val($("#cognDottore_" + idDot).text());
    $("#txtModCittaMedico").val($("#cittaDottore_" + idDot).text());
    $("#txtModDatNasMedico").val(d);
    $("#txtModTelMedico").val(parseInt($("#telDottore_" + idDot).text()));
    $("#txtModMailMedico").val($("#mailDottore_" + idDot).text());
    let vetAus = $("#imgDottore_" + idDot).css("background-image").split('/');
    $("#txtFotoModDot").val("");
    $("#txtSpecModDot").val($("#specDottore_" + idDot).text());
    $("#txtModUserMedico").val($("#userDottore_" + idDot).text());
    if ($("#ammDottore_" + idDot).text() == "SI") {
        $("#txtAmmModMedico").prop('checked', true);
    }else{
        $("#txtAmmModMedico").prop('checked', false);
    }
    idMedicoGlobal = idDot;
    $("#modalModMedico").modal("show");
}


function modDottore() {

    let amm = "NO";

    if ($("#txtAmmModMedico").prop('checked')) {
        amm = "SI";
    }

    if ($("#txtFotoModDot").val() != "") {
        if ($("#txtModNomeMedico").val() != "") {
            if ($("#txtModCognMedico").val() != "") {
                if ($("#txtModCittaMedico").val() != "") {
                    if (Date.parse($("#txtModDatNasMedico").val())) {
                        if ($("#txtModTelMedico").val().length == 11 && !(isNaN($("#txtModTelMedico").val()))) {
                            if ($("#txtModMailMedico").val().includes("@ambulatorioGiacardi.com")) {
                                if ($("#txtSpecModDot").val() != "") {
                                    if ($("#txtModUserMedico").val() != "") {
                                        $("#pErrorAddDot").hide();
                                        let dataNascita = $("#txtModDatNasMedico").val().split('-')[2] + "/" + $("#txtModDatNasMedico").val().split('-')[1] + "/" + $("#txtModDatNasMedico").val().split('-')[0];
                                        var formData = new FormData();
                                        formData.append('id', idMedicoGlobal);
                                        formData.append('nome', $("#txtModNomeMedico").val());
                                        formData.append('cognome', $("#txtModCognMedico").val());
                                        formData.append('citta', $("#txtModCittaMedico").val());
                                        formData.append('dataNascita', dataNascita);
                                        formData.append('telefono', parseInt($("#txtModTelMedico").val()));
                                        formData.append('mail', $("#txtModMailMedico").val());
                                        formData.append('foto', $('#txtFotoModDot').prop('files')[0]);
                                        formData.append('spec', $("#txtSpecModDot").val());
                                        formData.append('amm', amm);
                                        formData.append('user', $("#txtModUserMedico").val());
                                        let modDttore = inviaRichiestaMultipart("/api/modDottore", "POST", formData);
                                        modDttore.done(function (data) {
                                            $("#pErrorModMedico").hide();
                                            $("#pErrorModMedico").html("");
                                            $("#modalModMedico").modal("hide");
                                            gestInvioElDottori();
                                        });
                                        modDttore.fail(function (jqXHR) {
                                            printErrors(jqXHR, "pErrorModMedico");
                                        });
                                    } else {
                                        $("#pErrorModMedico").show();
                                        $("#pErrorModMedico").html("Inserire il Nome Utente del dottore");
                                    }
                                } else {
                                    $("#pErrorModMedico").show();
                                    $("#pErrorModMedico").html("Inserire la Specializzazione del dottore");
                                }
                            } else {
                                $("#pErrorModMedico").show();
                                $("#pErrorModMedico").html("La mail deve terminare con: @ambulatorioGiacardi.com");
                            }
                        } else {
                            $("#pErrorModMedico").show();
                            $("#pErrorModMedico").html("Il numero di telefono deve essere di 11 cifre");
                        }
                    } else {
                        $("#pErrorModMedico").show();
                        $("#pErrorModMedico").html("Inserire una Data di Nascita Valida");
                    }
                } else {
                    $("#pErrorModMedico").show();
                    $("#pErrorModMedico").html("Inserire una Città valida");
                }
            } else {
                $("#pErrorModMedico").show();
                $("#pErrorModMedico").html("Inserire un Cognome valido");
            }
        } else {
            $("#pErrorModMedico").show();
            $("#pErrorModMedico").html("Inserire un Nome valido");
        }
    }else{
        $("#pErrorModMedico").show();
        $("#pErrorModMedico").html("Inserire la Foto del Medico");
    }
    
}