
var displayConsoleLog = true;

function getItem(key){
	return localStorage.getItem(key);
}

function setItem(key, value){
	return localStorage.setItem(key, value);
}

function removeItem(key){
	localStorage.removeItem(key);
}

function consoleLog(obj){
	if(displayConsoleLog){
		console.log(obj);
	}
}