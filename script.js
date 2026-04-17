let currentRound = 1;
let currentTarget = 0;
let equationArr = []; // Nyimpen token ['10', '+', '5', '*', '...']
let usedNumbers = []; // Nyimpen id angka yang udah diklik
let gameTimer;
let totalScore = 0;
let teamName = "Tim Misterius";

// Navigasi
function showPage(pageId) {
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// 1. SETUP GAME
function saveNameAndStart() {
    const input = document.getElementById('teamNameInput').value;
    if(input.trim() === "") return alert("Isi nama tim lo dulu bos! 🐈");
    
    teamName = input;
    currentRound = 1;
    totalScore = 0;
    
    startRound();
    showPage('page-game');
}

// 2. GENERATE ROUND (Target makin susah, Timer diatur berdasar ronde)
function startRound() {
    document.getElementById('lvl-text').innerText = currentRound;
    document.getElementById('feedback-msg').innerText = "";
    
    // Tentukan waktu berdasarkan aturan (Ronde 1-2=3m, 3-4=4m, 5-6=5m, dst)
    let baseTime = 3; // Menit
    if(currentRound > 2) baseTime = 3 + Math.floor((currentRound - 1) / 2);
    runTimer(baseTime * 60);

    // Bikin Target Acak (Makin tinggi ronde, target makin gede dan gila)
    let minTarget = 50 * currentRound;
    let maxTarget = 200 * currentRound * (currentRound / 2 + 1);
    currentTarget = Math.floor(Math.random() * (maxTarget - minTarget + 1)) + minTarget;
    
    document.getElementById('target-number').innerText = currentTarget;

    // Reset Rumus & Papan Angka
    equationArr = [];
    usedNumbers = [];
    updateEquationDisplay();
    renderNumberPad();
}

// 3. RENDER PAPAN ANGKA (1-10) Diacak
function renderNumberPad() {
    const pad = document.getElementById('number-pad');
    pad.innerHTML = '';
    
    // Bikin array 1-10 terus di-shuffle biar seru
    let nums = [1,2,3,4,5,6,7,8,9,10];
    nums.sort(() => Math.random() - 0.5);

    nums.forEach((num, index) => {
        let btn = document.createElement('button');
        btn.className = 'num-btn';
        btn.id = `numbtn-${index}`;
        btn.innerText = num;
        btn.onclick = () => addNumber(num, index);
        pad.appendChild(btn);
    });
}

// 4. SISTEM INPUT KE LAYAR
function addNumber(num, btnIndex) {
    // Kalau angka terakhir di input itu angka juga, ga boleh langsung nempel (harus pake operator)
    if(equationArr.length > 0 && !isNaN(equationArr[equationArr.length-1])) return;
    
    equationArr.push(num.toString());
    usedNumbers.push(btnIndex);
    
    // Matiin tombolnya biar ga bisa dipencet 2x
    document.getElementById(`numbtn-${btnIndex}`).classList.add('used');
    updateEquationDisplay();
}

function addOperator(op) {
    equationArr.push(op);
    updateEquationDisplay();
}

function backspace() {
    if(equationArr.length === 0) return;
    
    let removed = equationArr.pop();
    
    // Kalau yang dihapus itu angka, idupin lagi tombolnya
    if(!isNaN(removed) && usedNumbers.length > 0) {
        let btnIndex = usedNumbers.pop();
        document.getElementById(`numbtn-${btnIndex}`).classList.remove('used');
    }
    updateEquationDisplay();
}

function clearEquation() {
    equationArr = [];
    usedNumbers = [];
    renderNumberPad(); // Render ulang biar tombol nyala semua
    updateEquationDisplay();
}

function updateEquationDisplay() {
    // Ubah * jadi × dan / jadi ÷ buat tampilan aja
    let displayStr = equationArr.map(item => {
        if(item === '*') return '×';
        if(item === '/') return '÷';
        return item;
    }).join(' ');
    
    document.getElementById('equation-display').innerText = displayStr;
    
    // Coba hitung Live Result
    try {
        let res = calculateSafe(equationArr);
        if(!isNaN(res)) {
            document.getElementById('equation-result').innerText = `= ${res}`;
            document.getElementById('equation-result').style.color = (res === currentTarget) ? '#76ff03' : '#888';
        } else {
            document.getElementById('equation-result').innerText = "= ?";
        }
    } catch(e) {
        document.getElementById('equation-result').innerText = "= ?";
    }
}

// 5. PARSER & CALCULATOR (Biar ^ ngitung Pangkat beneran)
function calculateSafe(tokens) {
    if(tokens.length === 0) return NaN;
    // Gabungin array jadi string rumus, contoh: "10 * 5 ^ 2"
    let expr = tokens.join(' ');
    
    // Ubah simbol ^ jadi fungsi Math.pow lewat format yang dimengerti math parser sederhana
    // Di sini kita pake trick convert ke operator JS: **
    let jsExpr = expr.replace(/\^/g, '**'); 
    
    try {
        // Warning: Function constructor dipake buat eval hitungan math dasar
        let result = new Function(`return ${jsExpr}`)();
        return result;
    } catch (e) {
        return NaN; // Kalau rumusnya ga logis (misal '10 + * 2')
    }
}

// 6. VALIDASI SUBMIT
function submitEquation() {
    const feedback = document.getElementById('feedback-msg');
    
    // Syarat 1: Semua angka wajib dipakai (array usedNumbers panjangnya 10)
    if(usedNumbers.length < 10) {
        feedback.innerText = "⚠️ SYARAT GAGAL: Lo belom pake semua angka (1-10)!";
        return;
    }

    // Syarat 2: Kalkulasi Valid dan Sama
    let result = calculateSafe(equationArr);
    
    if(isNaN(result)) {
        feedback.innerText = "❌ ERROR: Persamaan lo ngga masuk akal secara matematika.";
        return;
    }

    // Karena operasi bagi bisa ngasilin desimal, kita buletin/toleransi dikit (biar ga error 0.9999)
    if(Math.abs(result - currentTarget) < 0.0001) {
        // VALID! TARGET HANCUR!
        clearInterval(gameTimer);
        let roundScore = 1000 + (currentRound * 500); // Base score + bonus ronde
        totalScore += roundScore;
        
        document.getElementById('success-modal').classList.remove('hidden');
    } else {
        feedback.innerText = `❌ MELESET! Hasil lo = ${result}. Targetnya = ${currentTarget}.`;
    }
}

// 7. SISTEM NEXT ROUND & GAME OVER
function nextRound() {
    document.getElementById('success-modal').classList.add('hidden');
    currentRound++;
    startRound();
}

function endGame(reason) {
    clearInterval(gameTimer);
    document.getElementById('final-team-name').innerText = teamName;
    document.getElementById('final-level').innerText = currentRound;
    document.getElementById('final-score').innerText = totalScore;
    document.getElementById('gameover-reason').innerText = reason;
    showPage('page-gameover');
}

// 8. TIMER
function runTimer(seconds) {
    clearInterval(gameTimer);
    let time = seconds;
    const display = document.getElementById('timerDisplay');
    display.innerText = formatTime(time);
    display.style.color = "var(--neon-red)";
    
    gameTimer = setInterval(() => {
        time--;
        display.innerText = formatTime(time);
        
        if(time <= 0) {
            endGame("Waktu Habis (Time's Up!)");
        }
    }, 1000);
}

function formatTime(secs) {
    let m = Math.floor(secs/60); let s = secs % 60;
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}