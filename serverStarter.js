"use strict";
/* Moduli */
let express=require('express');
let bodyParser=require('body-parser');
let sessions = require("express-session");
let nodemailer = require('nodemailer'); //Modulo per invio Mail
let mongoClient = require("mongodb").MongoClient;
const fs = require('fs');
const ERRORS = require('errors');
const jwt = require("jsonwebtoken");
const HTTPS = require('https');
const bcrypt = require('bcrypt'); // Modulo per cifratura password
const saltRounds = 10;
const multer = require("multer"); // Modulo per salvataggio immagini su server
// Impostazioni multer
const storage = multer.diskStorage({
    destination:function (req, file, cb) {
        cb(null, "static/images");
    },
    filename:function (req,file, cb) {
        const now = new Date().toISOString(); const date = now.replace(/:/g, '-'); 
        cb(null, date + file.originalname);
    }
});

const upload = multer({storage:storage});

// Gestione Certificato
const privateKey = fs.readFileSync("keys/key.pem", "utf8");
const certificate = fs.readFileSync("keys/certificate.pem", "utf8");
const credentials = { "key": privateKey, "cert": certificate };

// code 600 - database connection error
ERRORS.create({
    code: 600,
    name: 'DB_CONNECTION',
    defaultMessage: 'An error occured when connecting to database'
});

// code 601 - query execution error
ERRORS.create({
    code: 601,
    name: 'QUERY_EXECUTE',
    defaultMessage: 'An error occured during the query execution'
});

// code 602 - Account già esistente
ERRORS.create({
    code: 602,
    name: 'EXISTING_USER',
    defaultMessage: 'An account with the same user already exists'
});

// code 603 - Mail già esistente
ERRORS.create({
    code: 603,
    name: 'EXISTING_EMAIL',
    defaultMessage: 'An account with the same email already exists'
});


let app=express();

const TIMEOUT = 300; // 60 SEC
let pageNotFound;

// avvio server
var httpsServer = HTTPS.createServer(credentials, app);
httpsServer.listen(8888, '127.0.0.1', function () {
    fs.readFile("./static/error.html", function (err, content) {
        if (err)
            content = "<h1>Risorsa non trovata</h1>"
        pageNotFound = content.toString();
    });
    console.log("Server in ascolto https://127.0.0.1: " + this.address().port);
});

/*********** MIDDLEWARE ************/

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(function(req, res, next){ //Next serve per passare alla route successiva
    let d=new Date();
    let key
    console.log(d.toLocaleTimeString() + ">_ " + req.method + " - " + req.originalUrl);
    for(key in req.query)
        console.log(key + ": " + req.query[key] + "\t");
    for(key in req.body)
        console.log(key + ": " + req.body[key] + "\t");
    for(key in req.params)
        console.log(key + ": " + req.params[key] + "\t");
    next();
});
app.use(express.static("./static"));
app.use("/static", express.static("static"));

/* --------------------------------------------------------------- */
// controllo token per dare l'accesso oppure no
app.get('/', function (req, res, next) {
    controllaToken(req, res, next);
});
app.get('/index.html', function (req, res, next) {
    controllaToken(req, res, next);
});
/* --------------------------------------------------------------- */

// controllo del token
app.use('/api', function (req, res, next) {
    controllaToken(req, res, next);
});

// controllo se il token è ancora valido e restituisco tipo utente e admin per controllare se può accedere alla pagina
app.post('/api/chkToken', function (req, res) {
    console.log(JSON.parse(JSON.stringify(req.payload)).tipoUtente);
    res.send({ "tipoUt": JSON.parse(JSON.stringify(req.payload)).tipoUtente, "admin": JSON.parse(JSON.stringify(req.payload)).admin});
});

// Controllo Validità Token
function controllaToken(req, res, next) {
    if (req.originalUrl == '/api/login' || req.originalUrl == '/api/logout' || req.originalUrl == '/api/registrati' || req.originalUrl == '/api/reimpostaPwd')
        next();
    else {
        let token = readCookie(req);
        if (token == '') {
            error(req, res, null, JSON.stringify(new ERRORS.Http403Error({})));
        } else {
            jwt.verify(token, privateKey, function (err, payload) {
                if (err)
                    error(req, res, err, JSON.stringify(new ERRORS.Http401Error({})));
                else {
                    // aggiornamento del token
                    var exp = Math.floor(Date.now() / 1000) + TIMEOUT;
                    payload = { ...payload, 'exp': exp }
                    token = createToken(payload, payload.tipoUtente, payload.admin)
                    writeCookie(res, token)
                    req.payload = payload;
                    next();
                }
            });
        }
    }
}

// Lettura Cookie
function readCookie(req) {
    var valoreCookie = "";
    if (req.headers.cookie) {
        var cookies = req.headers.cookie.split('; ');
        for (var i = 0; i < cookies.length; i++) {
            cookies[i] = cookies[i].split("=");
            if (cookies[i][0] == "token") {
                valoreCookie = cookies[i][1];
                break;
            }
        }
    }
    return valoreCookie;
}

// Login
app.post('/api/login', function (req, res, next) {
    let tabella;
    let tipoUtente;
    let admin;

    if (req.body.tipoUt == "Medico") {
        tabella = "Medici";
        tipoUtente = "MEDICO";
    }else{
        tabella = "Utenti";
        tipoUtente = "PAZIENTE";
    }

    if (tabella == undefined) {
        error(req, res, null, JSON.stringify(new ERRORS.Http401Error({})));
    }else{
        mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
            if (err)
                error(req, res, err, JSON.stringify(new ERRORS.DB_CONNECTION({})));
            else {
                const DB = client.db('Ambulatorio');
                const collection = DB.collection(tabella);
                let username = req.body.username;
                collection.findOne({ "user": username }, function (err, dbUser) {
                    if (err)
                        error(req, res, err, JSON.stringify(new ERRORS.QUERY_EXECUTE({})));
                    else {
                        console.log(dbUser);
                        if (dbUser == null)
                            error(req, res, null, JSON.stringify(new ERRORS.Http401Error({})));
                        else {
                            console.log("Originale: " + req.body.password);
                            console.log("Hash: " + dbUser.pwd);
                            bcrypt.compare(req.body.password, dbUser.pwd, function (errC, resC) {
                                if (resC) {
                                    if (dbUser.admin == "SI") {
                                        admin = true;
                                    } else {
                                        admin = false;
                                    }
                                    let token = createToken(dbUser, tipoUtente, admin);
                                    writeCookie(res, token);
                                    res.send({ "ris": "ok", "tipoUt": tipoUtente, "admin":admin });
                                }else{
                                    error(req, res, err, JSON.stringify(new ERRORS.Http401Error({})));
                                }
                            });
                        }
                    }
                    client.close();
                });
            }
        });
    }
    
});

function createToken(obj, tipoUt, admin) {
    let token = jwt.sign({
        '_id': obj._id,
        'username': obj.username,
        'tipoUtente':tipoUt,
        'admin':admin,
        'iat': obj.iat || Math.floor(Date.now() / 1000),
        'exp': obj.exp || Math.floor(Date.now() / 1000 + TIMEOUT)
    },
        privateKey
    );
    console.log("Creato Nuovo token");
    console.log(token);
    return token;
}

function writeCookie(res, token) {
    res.set("Set-Cookie", "token=" + token + ";max-age=" + TIMEOUT + ";Path=/;httponly=true;secure=true");
}

// Logout
app.post('/api/logout', function (req, res, next) {
    res.set("Set-Cookie", "token=;max-age=-1;Path=/;httponly=true");
    res.send({ "ris": "LogOutOk" });
});

// Registrazione Paziente
app.post("/api/registrati", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Utenti");
            collection.count({ user: req.body.user }, function (err, resultsUser) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    if (resultsUser == 0) {
                        collection.count({ mail: req.body.mail }, function (err, resultsMail) {
                            if (err) {
                                error(res, { "code": 500, "message": "Errore esecuzione query" });
                            } else {
                                if (resultsMail == 0) {
                                    collection.find({}).sort({ _id: 1 }).toArray(function (err, results) {
                                        if (err) {
                                            error(res, { "code": 500, "message": "Errore esecuzione query" });
                                        } else {
                                            let vet = JSON.parse(JSON.stringify(results));
                                            let idUt = parseInt(vet[vet.length - 1]["_id"]) + 1;
                                            bcrypt.hash(req.body.pwd, saltRounds, function (errC, hash) {
                                                collection.insertOne({ _id: idUt, nome: req.body.nome, cognome: req.body.cognome, citta: req.body.citta, dataNascita: req.body.dataNascita, telefono: parseInt(req.body.telefono), mail: req.body.mail, user: req.body.user, pwd: hash }, function (err, results) {
                                                    console.log(err);
                                                    if (err) {
                                                        error(res, { "code": 500, "message": "Errore esecuzione query" });
                                                    } else {
                                                        res.send(JSON.stringify("regOk"));
                                                    }
                                                });
                                                client.close();
                                            });                                              
                                        }
                                    });
                                } else {
                                    error(req, res, err, JSON.stringify(new ERRORS.EXISTING_EMAIL({})));
                                }

                            }
                        });
                    } else {
                        error(req, res, err, JSON.stringify(new ERRORS.EXISTING_USER({})));
                    }
                }
            });
        }
    });
});

// Elenco Ricoveri
app.post("/api/ricoveri", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Ricoveri");
            let codUt = parseInt(JSON.parse(JSON.stringify(req.payload))._id);
            let codJson;
            if (JSON.parse(JSON.stringify(req.payload)).tipoUtente == "PAZIENTE") { //in base a chi si è collegato cambio la condizone di ricerca
                codJson = { "codUtente": codUt };
            } else {
                codJson = { "codMedico": codUt };
            }
            console.log(codJson);
            collection.find(codJson).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    console.log(results);
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Elenco Pazienti Medico
app.post("/api/elPazMedico", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Visite");
            let medico = parseInt(JSON.parse(JSON.stringify(req.payload))._id);
            collection.aggregate([{ $match: { medico: medico } },{ $lookup: { from: "Utenti", localField: "paziente", foreignField:"_id", as:"elPaz"}}]).project({_id:0, elPaz:1}).toArray(function (err, results) {
                console.log(err)
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    console.log(results);
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Inserimento Ricovero
app.post("/api/aggRicovero", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Ricoveri");
            let medico = parseInt(JSON.parse(JSON.stringify(req.payload))._id);
            collection.find({}).sort({ _id: 1 }).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let vet = JSON.parse(JSON.stringify(results));
                    let idRic = parseInt(vet[vet.length - 1]["_id"]) + 1;
                    collection.insertOne({ _id: idRic, anno: parseInt(req.body.anno), ospedale: req.body.ospedale, giorni: parseInt(req.body.durata), codUtente: parseInt(req.body.paz), codMedico:medico}, function (err, results) {
                        console.log(err);
                        if (err) {
                            error(res, { "code": 500, "message": "Errore esecuzione query" });
                        } else {
                            let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                            writeCookie(res, token);
                            res.send(JSON.stringify("aggRicOk"));
                        }
                    });
                    client.close();
                }
            });
        }
    });
});

// Eliminazione Ricovero
app.post("/api/eliminaRicovero", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Ricoveri");
            let idRicovero = parseInt(req.body.id);
            collection.deleteOne({ _id: idRicovero }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    console.log(JSON.parse(results).n);
                    res.send(JSON.stringify("elRicOk"));
                }
            });
            client.close();
        }
    }); 
});

// Modifica Ricovero
app.post("/api/modificaRicovero", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Ricoveri");
            let idRicovero = parseInt(req.body.id);
            collection.updateOne({ _id: idRicovero }, { $set: { anno: parseInt(req.body.anno), ospedale: req.body.ospedale, giorni: parseInt(req.body.durata)}}, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.send(JSON.stringify("modRicOk"));
                }
            });
            client.close();
        }
    }); 
});

// Elenco Visite
app.post("/api/visite", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Visite");
            let paz = parseInt(JSON.parse(JSON.stringify(req.payload))._id);
            let codJson = "";
            if (JSON.parse(JSON.stringify(req.payload)).tipoUtente == "PAZIENTE") { //in base a chi si è collegato cambio la condizone di ricerca
                codJson = {"paziente":parseInt(paz)};
            }else{
                codJson = {"medico": parseInt(paz)};
            }
            console.log(JSON.parse(JSON.stringify(codJson)));
            collection.aggregate([{ $match: JSON.parse(JSON.stringify(codJson)) }, { $lookup: { from: "Reparti", localField: "reparto", foreignField: "_id", as: "elRep" } }, { $lookup: { from: "Medici", localField: "medico", foreignField: "_id", as: "elMed" } }]).project({ medico: 0, reparto: 0 }).toArray(function (err, results) {
                console.log(err);
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    console.log(results);
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Elenco Ore in cui il Medico è già occupato
app.post("/api/orariVisite", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Visite");
            console.log(req.body.data);
            collection.find({ $and: [{ data: req.body.data}, {medico:parseInt(req.body.medico)}]}).project({ _id: 0, ora: 1 }).toArray(function (err, results) {
                console.log(err);
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    console.log(results);
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Eliminazione Visita
app.post("/api/eliminaVisita", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Visite");
            let idVisita = parseInt(req.body.id);
            collection.deleteOne({ _id: idVisita }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    console.log(JSON.parse(results).n);
                    res.send(JSON.stringify("elVisitaOk"));
                }
            });
            client.close();
        }
    });
});

// Elenco Visite
app.post("/api/elMedici", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Medici");
            let paz = parseInt(JSON.parse(JSON.stringify(req.payload))._id);
            console.log(paz);
            collection.find({}).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    console.log(results);
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Elenco Reparti
app.post("/api/elReparti", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Reparti");
            let paz = parseInt(JSON.parse(JSON.stringify(req.payload))._id);
            console.log(paz);
            collection.find({}).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    console.log(results);
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Aggiunta Visita
app.post("/api/addVisita", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Visite");
            collection.find({}).sort({ _id: 1 }).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let vet = JSON.parse(JSON.stringify(results));
                    let idVisita = parseInt(vet[vet.length - 1]["_id"]) + 1;
                    let paz = parseInt(JSON.parse(JSON.stringify(req.payload))._id);
                    collection.insertOne({ _id: idVisita, reparto: parseInt(req.body.reparto), medico: parseInt(req.body.medico), data: req.body.data, ora: req.body.ora, paziente: paz, importo: "", pagato: "NO", tipo_pagamento: "", medicinali:"" }, function (err, results) {
                        console.log(err);
                        if (err) {
                            error(res, { "code": 500, "message": "Errore esecuzione query" });
                        } else {
                            let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                            writeCookie(res, token);
                            res.send(JSON.stringify("addVisitaOk"));
                        }
                    });
                    client.close();
                }
            });
        }
    });
});

// Elenco Pazienti
app.post("/api/elPaz", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Utenti");
            let paz = parseInt(JSON.parse(JSON.stringify(req.payload))._id);
            console.log(paz);
            collection.find({}).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    console.log(results);
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Elenco Tipi Pagamento
app.post("/api/elTipiPag", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("TipiPagamento");
            let paz = parseInt(JSON.parse(JSON.stringify(req.payload))._id);
            console.log(paz);
            collection.find({}).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    console.log(results);
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Modifica Visita
app.post("/api/modificaVisita", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Visite");
            let idRicovero = parseInt(req.body.id);
            let vetMedicinali = "";
            if (req.body.medicinali != "") {
                vetMedicinali = req.body.medicinali.split('-');
            }
            collection.updateOne({ _id: idRicovero }, { $set: { reparto: parseInt(req.body.reparto), medico: parseInt(req.body.medico), data: req.body.data, ora: req.body.ora, paziente: parseInt(req.body.paziente), importo: parseInt(req.body.importo), pagato: req.body.pagato, tipo_pagamento: req.body.tipo_pagamento, medicinali: vetMedicinali} }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.send({"ris":"modVisOk"});
                }
            });
            client.close();
        }
    });
});

// Elenco Pazienti
app.post("/api/pazienti", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Utenti");
            let admin = true;//payload.admin;
            collection.find({}).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    console.log(results);
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Eliminazione Pazienti
app.post("/api/eliminaPaziente", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Utenti");
            let idPaziente = parseInt(req.body.id);
            collection.deleteOne({ _id: idPaziente }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    console.log(JSON.parse(results).n);
                    res.send(JSON.stringify("elimPazOk"));
                }
            });
            client.close();
        }
    });
});

// Modifica Paziente
app.post("/api/modificaPaziente", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Utenti");
            let idPaz = parseInt(req.body.id);
            collection.updateOne({ _id: idPaz }, { $set: { nome: req.body.nome, cognome: req.body.cognome, citta: req.body.citta, dataNascita: req.body.data, telefono: parseInt(req.body.telefono), mail: req.body.mail, user: req.body.user} }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.send(JSON.stringify("modPazOk"));
                }
            });
            client.close();
        }
    });
});

// Elenco Medici
app.post("/api/medici", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Medici");
            let admin = JSON.parse(JSON.stringify(req.payload)).admin;
            collection.find({}).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    console.log(results);
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Reimpostazione Password
app.post("/api/reimpostaPwd", function (req, res) {
    let tabella;
    let tipoUtente;

    if (req.body.tipoUt == "Medico") {
        tabella = "Medici";
        tipoUtente = "MEDICO";
    } else {
        tabella = "Utenti";
        tipoUtente = "PAZIENTE";
    }
    console.log(tabella);
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection(tabella);
            bcrypt.hash(req.body.password, saltRounds, function (errC, hash) {
                console.log(hash);
                console.log(errC);
                collection.updateOne({ $and: [{ "mail": req.body.mail }, { "user": req.body.username }] }, { $set: { "pwd": hash } }, function (err, results) {
                    console.log(err);
                    if (err) {
                        error(res, { "code": 500, "message": "Errore esecuzione query" });
                    } else {
                        let transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: 'noreplyambulatoriogiacardi@gmail.com',
                                pass: 'NoreplyGiac'
                            }
                        });

                        let mailOptions = {
                            from: 'noreplyambulatoriogiacardi@gmail.com',
                            to: req.body.mail,
                            subject: 'Aggiornamento Password',
                            text: 'Gentile Utente, le scriviamo per notificarle il cambiamento della Password del suo account presso la nostra Struttura.\n Nuova Password:' + req.body.password +".\n La preghiamo di contattare l'amministratore all'indirizzo: info@ambulatorioGiacardi.com in caso di problemi."
                        };

                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log('Email sent: ' + info.response);
                            }
                        });
                        res.send(JSON.stringify("reimpostaPwdOk"));
                    }
                });
                client.close();
            });
        }
    });
});

// Numero visite pagate per ogni tipo pagamento
app.post("/api/nPagamenti", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Visite");
            collection.aggregate([{ $group: { _id: "$pagato", totale: { $sum: 1 } } }]).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Numero di utenti che hanno pagato per ogni tipo pagamento
app.post("/api/nUtentiPagamenti", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Visite");
            collection.aggregate([{ $match: {tipo_pagamento:{ $ne:""}}},{ $group: { _id: "$tipo_pagamento", totale: { $sum: 1 } } }, { $lookup: { from: "TipiPagamento", localField: "_id", foreignField: "_id", as: "tipoPag" }}]).toArray(function (err, results) {
                console.log(err);
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(results));
                }
            });
            client.close();
        }
    });
});

// Eliminazione Tipo Pagamento
app.post("/api/eliminaTipoPag", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("TipiPagamento");
            let idTipoPag = parseInt(req.body.id);
            collection.deleteOne({ _id: idTipoPag }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    console.log(JSON.parse(results).n);
                    res.send(JSON.stringify("elimTipoPagOk"));
                }
            });
            client.close();
        }
    });
});

// Aggiunta Tipo Pagamento
app.post("/api/addTipoPag", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("TipiPagamento");
            collection.find({}).sort({ _id: 1 }).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let vet = JSON.parse(JSON.stringify(results));
                    let idTipoPag = parseInt(vet[vet.length - 1]["_id"]) + 1;
                    collection.insertOne({ _id: idTipoPag, nome: req.body.nome}, function (err, results) {
                        console.log(err);
                        if (err) {
                            error(res, { "code": 500, "message": "Errore esecuzione query" });
                        } else {
                            let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                            writeCookie(res, token);
                            res.send(JSON.stringify("addTipoPagOk"));
                        }
                    });
                    client.close();
                }
            });
        }
    });
});

// Modifica Tipo Pagamento
app.post("/api/modificaTipoPag", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("TipiPagamento");
            let idTipoPag = parseInt(req.body.id);
            collection.updateOne({ _id: idTipoPag }, { $set: { nome: req.body.nome} }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.send(JSON.stringify("modTipoPagOk"));
                }
            });
            client.close();
        }
    });
});

// Aggiunta Reparto
app.post("/api/addRep", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Reparti");
            collection.find({}).sort({ _id: 1 }).toArray(function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let vet = JSON.parse(JSON.stringify(results));
                    let idRep = parseInt(vet[vet.length - 1]["_id"]) + 1;
                    collection.insertOne({ _id: idRep, nome: req.body.nome, descrizione: req.body.descrizione}, function (err, results) {
                        console.log(err);
                        if (err) {
                            error(res, { "code": 500, "message": "Errore esecuzione query" });
                        } else {
                            let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                            writeCookie(res, token);
                            res.send(JSON.stringify("addRepOk"));
                        }
                    });
                    client.close();
                }
            });
        }
    });
});

// Eliminazione Reparto
app.post("/api/eliminaReparto", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Reparti");
            let idReparto = parseInt(req.body.id);
            collection.deleteOne({ _id: idReparto }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    console.log(JSON.parse(results).n);
                    res.send(JSON.stringify("elimRepOk"));
                }
            });
            client.close();
        }
    });
});

// Modifica Reparto
app.post("/api/modificaRep", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Reparti");
            let idReparto = parseInt(req.body.id);
            collection.updateOne({ _id: idReparto }, { $set: { nome: req.body.nome, descrizione: req.body.descrizione} }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.send(JSON.stringify("modRepOk"));
                }
            });
            client.close();
        }
    });
});

// Eliminazione Dottore
app.post("/api/eliminaDottore", function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Medici");
            let idMedico = parseInt(req.body.id);
            collection.deleteOne({ _id: idMedico }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.send(JSON.stringify("elimDottoreOk"));
                }
            });
            client.close();
        }
    });
});

//Aggiunta Dottore
app.post("/api/aggiungiDottore", upload.single("foto"),function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Medici");
            collection.count({ user: req.body.user }, function (err, resultsUser) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    if (resultsUser == 0) {
                        collection.count({ mail: req.body.mail }, function (err, resultsMail) {
                            if (err) {
                                error(res, { "code": 500, "message": "Errore esecuzione query" });
                            } else {
                                if (resultsMail == 0) {
                                    collection.find({}).sort({ _id: 1 }).toArray(function (err, results) {
                                        if (err) {
                                            error(res, { "code": 500, "message": "Errore esecuzione query" });
                                        } else {
                                            let vet = JSON.parse(JSON.stringify(results));
                                            let idMedico = parseInt(vet[vet.length - 1]["_id"]) + 1;
                                            bcrypt.hash(req.body.pwd, saltRounds, function (errC, hash) {
                                                collection.insertOne({ _id: idMedico, nome: req.body.nome, cognome: req.body.cognome, citta: req.body.citta, dataNascita: req.body.dataNascita, telefono: parseInt(req.body.telefono), mail: req.body.mail, foto: req.file.path, spec: req.body.spec, admin: req.body.amm, user: req.body.user, pwd: hash }, function (err, results) {
                                                    console.log(err);
                                                    if (err) {
                                                        error(res, { "code": 500, "message": "Errore esecuzione query" });
                                                    } else {
                                                        let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                                                        writeCookie(res, token);
                                                        res.send(JSON.stringify("aggDottOk"));
                                                    }
                                                });
                                                client.close();
                                            });
                                        }
                                    });
                                } else {
                                    error(req, res, err, JSON.stringify(new ERRORS.EXISTING_EMAIL({})));
                                }

                            }
                        });
                    } else {
                        error(req, res, err, JSON.stringify(new ERRORS.EXISTING_USER({})));
                    }
                }
            });
        }
    });
});

// Modifica Dottore
app.post("/api/modDottore", upload.single("foto"),function (req, res) {
    mongoClient.connect("mongodb://127.0.0.1:27017", { "useNewUrlParser": true }, function (err, client) {
        if (err) {
            error(res, { "code": 500, "message": "Errore connessione al DB" });
        } else {
            let db = client.db("Ambulatorio");
            let collection = db.collection("Medici");
            let idMedico = parseInt(req.body.id);
            collection.updateOne({ _id: idMedico }, { $set: { nome: req.body.nome, cognome: req.body.cognome, citta: req.body.citta, dataNascita: req.body.dataNascita, telefono: parseInt(req.body.telefono), mail: req.body.mail, foto: req.file.path, spec: req.body.spec, admin: req.body.amm, user: req.body.user } }, function (err, results) {
                if (err) {
                    error(res, { "code": 500, "message": "Errore esecuzione query" });
                } else {
                    let token = createToken(req.payload, JSON.parse(JSON.stringify(req.payload)).tipoUtente, JSON.parse(JSON.stringify(req.payload)).admin);
                    writeCookie(res, token);
                    res.send(JSON.stringify("modMedicoOk"));
                }
            });
            client.close();
        }
    });
});

// gestione degli errori
function error(req, res, err, httpError) {
    console.log("httpError: " + httpError);
    if (err)
        console.log(err.message);

    res.status(JSON.parse(httpError).code);
    console.log("URI: " + req.originalUrl);
    if (req.originalUrl.startsWith("/api"))
        res.send(httpError);
    else
        res.sendFile('login.html', { root: './static' })
}

/***********    Gestione dell'errore    ***********/

// default route finale
app.use('/', function (req, res, next) {
    res.status(404)
    if (req.originalUrl.startsWith("/api")) {
        res.send('Risorsa non trovata');
    } else {
        res.send(pageNotFound);
    }
});