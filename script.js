document.addEventListener("DOMContentLoaded", () => {
    const ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
        console.log('Conectado al servidor WebSocket');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'seatUpdate') {
            console.log('Mensaje recibido del servidor:', message);
            updateSeatsFromMessage(message.zone, message.seats);
        }
    };

    ws.onclose = () => {
        console.log('Desconectado del servidor WebSocket');
    };

    ws.onerror = (error) => {
        console.error('Error en la conexión WebSocket:', error);
    };

    const auditorium = document.getElementById("auditorium");
    const zoneSummary = document.getElementById("zoneSummary");
    const overallSummary = document.getElementById("overallSummary");
    const resetButton = document.getElementById("resetButton");
    const overallSummaryButton = document.getElementById("overallSummaryButton");
    const zoneButtons = document.querySelectorAll(".zone-button");
    let seats = [];
    let currentZone = null;

    const zoneConfigurations = {
        1: { rows: 10, cols: 10 },
        2: { rows: 9, cols: 10 },
        3: {
            rows: 8, cols: 10,
            blankSpaces: [
                { row: 3, col: 3 }, { row: 3, col: 4 }, { row: 3, col: 5 }, { row: 3, col: 6 },
                { row: 2, col: 4 }, { row: 2, col: 5 },
                { row: 1, col: 4 }, { row: 1, col: 5 },
                { row: 0, col: 4 }, { row: 0, col: 5 }
            ]
        },
        4: {
            rows: 10, cols: 11,
            blankSpaces: [
                { row: 1, col: 2 }, { row: 2, col: 2 }, { row: 3, col: 2 }, { row: 4, col: 2 },
                { row: 5, col: 2 }, { row: 6, col: 2 }, { row: 7, col: 2 }, { row: 8, col: 2 }, { row: 9, col: 2 },
                { row: 1, col: 7 }, { row: 2, col: 7 }, { row: 3, col: 7 }, { row: 4, col: 7 },
                { row: 5, col: 7 }, { row: 6, col: 7 }, { row: 7, col: 7 }, { row: 8, col: 7 }, { row: 9, col: 7 }
            ]
        },
        5: { rows: 12, cols: 10 }
    };

    const savedSeats = JSON.parse(localStorage.getItem('seats')) || {};

    zoneButtons.forEach(button => {
        button.addEventListener("click", () => {
            currentZone = button.dataset.zone;
            highlightSelectedZone(button);
            showSeats(currentZone);
        });
    });

    function showSeats(zone) {
        auditorium.innerHTML = '';
        seats = [];
        auditorium.style.display = 'grid';

        const config = zoneConfigurations[zone];
        const totalSeats = config.rows * config.cols - countTotalBlankSpaces(config.blankSpaces);
        const zoneSeats = savedSeats[zone] || Array(totalSeats).fill("false");

        auditorium.style.gridTemplateColumns = `repeat(${config.cols}, minmax(var(--seat-size), 1fr))`;

        let seatIndex = 0;
        for (let i = 0; i < config.rows; i++) {
            for (let j = 0; j < config.cols; j++) {
                const isBlank = config.blankSpaces?.some(space => space.row === i && space.col === j);
                if (isBlank) {
                    const blankDiv = document.createElement("div");
                    blankDiv.classList.add("blank-space");
                    auditorium.appendChild(blankDiv);
                } else {
                    const seat = createSeat(zoneSeats[seatIndex]);
                    seats.push(seat);
                    auditorium.appendChild(seat);
                    seatIndex++;
                }
            }
        }
        updateSummary();
    }

    function createSeat(status) {
        const seat = document.createElement("div");
        seat.classList.add("seat");
        seat.dataset.occupied = status;
        if (status === "true") {
            seat.classList.add("occupied");
        }
        seat.addEventListener("click", () => toggleSeat(seat));
        return seat;
    }

    function toggleSeat(seat) {
        seat.dataset.occupied = seat.dataset.occupied === "false" ? "true" : "false";
        seat.classList.toggle("occupied");
        updateSummary();
        saveSeats();
        sendSeatUpdate();
    }

    function updateSummary() {
        const occupiedSeats = seats.filter(seat => seat.dataset.occupied === "true").length;
        const totalSeats = seats.length;
        zoneSummary.textContent = `Zona ${currentZone} - Total de asientos: ${totalSeats}, Ocupados: ${occupiedSeats}, Libres: ${totalSeats - occupiedSeats}`;
    }

    function saveSeats() {
        const seatStatus = seats.map(seat => seat.dataset.occupied);
        savedSeats[currentZone] = seatStatus;
        localStorage.setItem('seats', JSON.stringify(savedSeats));
    }

    function resetSeats() {
        seats.forEach(seat => {
            seat.dataset.occupied = "false";
            seat.classList.remove("occupied");
        });
        updateSummary();
        saveSeats();
        sendSeatUpdate();
    }

    function highlightSelectedZone(selectedButton) {
        zoneButtons.forEach(button => button.classList.remove("selected-zone"));
        selectedButton.classList.add("selected-zone");
    }

    function showOverallSummary() {
        let totalOccupied = 0;
        let totalSeats = 0;

        for (let zone in zoneConfigurations) {
            const config = zoneConfigurations[zone];
            const zoneSeatStatus = savedSeats[zone] || Array(config.rows * config.cols - countTotalBlankSpaces(config.blankSpaces)).fill("false");
            const zoneTotalSeats = config.rows * config.cols - countTotalBlankSpaces(config.blankSpaces);
            const zoneOccupiedSeats = zoneSeatStatus.filter(status => status === "true").length;

            totalSeats += zoneTotalSeats;
            totalOccupied += zoneOccupiedSeats;
        }

        overallSummary.textContent = `Asistencia General - Total de asientos: ${totalSeats}, Ocupados: ${totalOccupied}, Libres: ${totalSeats - totalOccupied}`;
    }

    function countTotalBlankSpaces(blankSpaces) {
        return blankSpaces ? blankSpaces.length : 0;
    }

    function sendSeatUpdate() {
        const message = {
            type: 'seatUpdate',
            zone: currentZone,
            seats: seats.map(seat => seat.dataset.occupied),
        };
        ws.send(JSON.stringify(message));
    }

    resetButton.addEventListener("click", resetSeats);
    overallSummaryButton.addEventListener("click", showOverallSummary);

    updateSummary();
});

function updateSeatsFromMessage(zone, seatStatuses) {
    if (currentZone === zone) {
        seats.forEach((seat, index) => {
            seat.dataset.occupied = seatStatuses[index];
            if (seatStatuses[index] === "true") {
                seat.classList.add("occupied");
            } else {
                seat.classList.remove("occupied");
            }
        });
        updateSummary();
    }
}
