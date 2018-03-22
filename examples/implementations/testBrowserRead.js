import PngDBReader from "../../src/PngDBReader";
import FieldTypes from "../../src/FieldTypes";

"use strict";

var dir = '../../test/parcels/db';
// var dir = './data';
var db = new PngDBReader();
var dbCrossCheck = new PngDBReader();
var crossCheckLoaded = false;
dbCrossCheck.loadAllRecordsFromJson(`${dir}/full.json`).then(() => {
    crossCheckLoaded = true;
    _showTable(dbCrossCheck, $crossCheckPanel);
    _crossCheckData();
});

var _crossCheckData = function () {
    if (!crossCheckLoaded) return;
    var safeties = {};
    Object.keys(db.fields).forEach(function (fieldName) {
        safeties[fieldName] = 30;//only report 30 mismatches per field
    });

    const report_err = (i, fieldName, err) => {
        if (safeties[fieldName]-- > 0) {
            console.error(`MISMATCH on record ${i + 1} for ${fieldName}: ${err}`);
        }
    };

    db.records.forEach(function (record, i) {
        var matchingRecord = dbCrossCheck.records[i];
        Object.keys(db.fields).forEach(function (fieldName) {
            if (db.fields[fieldName].dataLoaded) {
                const jsonVal = matchingRecord[fieldName];
                const val = record[fieldName];

                if (db.fields[fieldName].type === FieldTypes.DECIMAL.name) {
                    if (db.fields[fieldName].treatAsArray) {
                        if (jsonVal.length !== val.length) {
                            report_err(i, fieldName, 'MISMATCHED ARRAY LENGTH ');
                        }
                        for (let j = 0; j < jsonVal.length; j++) {
                            if (Math.abs(jsonVal[j] - val[j]) > 0.001) {
                                report_err(i, fieldName, 'MISMATCHED DECIMAL IN ARRAY @' + j);
                            }
                        }
                    } else {
                        if (Math.abs(jsonVal - val) > 0.001) {
                            report_err(i, fieldName, 'MISMATCHED DECIMAL ');
                        }
                    }
                } else {
                    if (jsonVal !== val) {
                        report_err(i, fieldName, 'MISMATCHED VALUE ');
                    }
                }
            }
        });
    });
};

var _showTable = function (pngDb, $panel) {
    $panel.empty();

    var $headers = $('<div class="headers">').appendTo($panel);
    var $recordList = $('<ol>').appendTo($panel);
    Object.keys(pngDb.fields).forEach(function (fieldName) {
        if (pngDb.fields[fieldName].dataLoaded) {
            $('<div class="header">').text(fieldName).appendTo($headers);
        }
    });
    pngDb.records.forEach(function (record, i) {
        if (i < 30) {
            var $rec = $('<li>').appendTo($recordList);
            Object.keys(pngDb.fields).forEach(function (fieldName) {
                if (pngDb.fields[fieldName].dataLoaded) {
                    var $val = $('<div class="record">').text(JSON.stringify(record[fieldName])).appendTo($rec);
                }
            });
        }
    });
    $('<li>').text(`... and ${pngDb.records.length - 30} more`).appendTo($recordList);
};

var $panel = $('<div>').appendTo('body');
var $recordsPanel = $('<div class="record-list">').appendTo('body');
var $crossCheckPanel = $('<div class="record-list">').appendTo('body');
db.load(`${dir}/test-db.json`).then(() => {
    Object.keys(db.fields).forEach(function (fieldName) {
        $('<button>').text(fieldName).appendTo($panel).click(function () {
            db.loadField(fieldName).then(() => {
                _showTable(db, $recordsPanel);
                _crossCheckData();
            })
        });
    });
});


