function sendRequest(url,method,parameters,callback){
	$.ajax({
		url: url, //default: currentPage
		type: method,
		contentType: "application/json; charset=UTF-8",
		dataType: "text",   //usiamo un dato di tipo testo perchè al momento del parsing possiamo debuggarlo visualizzandolo
		data: parameters,
		timeout : 6000000,
		success: callback
		/*error : function(jqXHR, test_status, str_error){
			//console.log("No connection to " + link);
			//console.log("Test_status: " + test_status);
			alert("Error: " + str_error);
		}*/
	});
}

function sendRequestNoCallback(url,method,parameters){
	return $.ajax({
        url: url, //default: currentPage
        contentType: "application/json; charset=UTF-8",
		type: method,
		dataType: "json",
		data: parameters,
		timeout: 5000
	});
}

// Funzione per invio richiesta con immagine
function inviaRichiestaMultipart(url, method, parameters) {
	return $.ajax({
		url: url, //default: currentPage
		contentType: false,
		processData: false,
		type: method,
		data: parameters,
		timeout: 5000
	});
}

function inviaRichiesta(url, method, parameters = {}) {
	let contentType;
	if (method.toLowerCase() == "get") {
		contentType = "application/x-www-form-urlencoded; charset=UTF-8"
	}
	else {
		contentType = "application/json; charset=utf-8"
		parameters = JSON.stringify(parameters);
	}

	return $.ajax({
		url: url, //default: currentPage
		type: method,
		data: parameters,
		contentType: contentType,
		dataType: "json",
		timeout: 5000,
	});
}

function error(jqXHR, testStatus, strError) {
	if (jqXHR.status == 0)
		alert("server timeout");
	else if (jqXHR.status == 200)
		alert("Formato dei dati non corretto : " + jqXHR.responseText);
	else
		alert("Server Error: " + jqXHR.status + " - " + jqXHR.responseText);
}

function printErrors(jqXHR, par) {
	if (jqXHR.status == 401 || jqXHR.status == 403) { // unauthorized
		window.location = "index.html";
	}else{
		$("#" + par).show().text("Server Error: " + jqXHR.status + " - " + jqXHR.responseText);
	}
}