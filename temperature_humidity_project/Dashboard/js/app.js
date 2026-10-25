const CHANNEL_ID = "3549174";
const READ_API_KEY = "IXUMHJPQHUFC0RZP";
const API_URL = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=20`;

// Määritä kynnysarvot varoituksia varten
const TEMP_MIN = 20.0;
const TEMP_MAX = 25.0;
const HUM_MIN = 30.0;
const HUM_MAX = 70.0;

google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(fetchAndDrawChart);

async function fetchAndDrawChart() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();
        const feeds = data.feeds;

        if (feeds && feeds.length > 0) {
            const latest = feeds[feeds.length - 1];

            const tempVal = latest.field1 ? parseFloat(latest.field1) : NaN;
            const humVal = latest.field2 ? parseFloat(latest.field2) : NaN;

            // --- LÄMPÖTILAN PÄIVITYS JA KYNNYSARVOTARKISTUS ---
            const tempElement = document.getElementById("temp-value");
            if (tempElement) {
                if (!isNaN(tempVal)) {
                    tempElement.textContent = tempVal.toFixed(1); // Vain pelkkä numero
                    if (tempVal < TEMP_MIN || tempVal > TEMP_MAX) {
                        tempElement.classList.add('warning-text');
                    } else {
                        tempElement.classList.remove('warning-text');
                    }
                } else {
                    tempElement.textContent = "--";
                }
            }

            // --- KOSTEUDEN PÄIVITYS JA KYNNYSARVOTARKISTUS ---
            const humElement = document.getElementById("hum-value");
            if (humElement) {
                if (!isNaN(humVal)) {
                    humElement.textContent = humVal.toFixed(1); // Vain pelkkä numero
                    if (humVal < HUM_MIN || humVal > HUM_MAX) {
                        humElement.classList.add('warning-text');
                    } else {
                        humElement.classList.remove('warning-text');
                    }
                } else {
                    humElement.textContent = "--";
                }
            }
        }

        const chartDataArray = [['Time', 'Temperature (°C)', 'Humidity (%)']];

        feeds.forEach(feed => {
            const timeStr = new Date(feed.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const temp = parseFloat(feed.field1) || 0;
            const hum = parseFloat(feed.field2) || 0;
            chartDataArray.push([timeStr, temp, hum]);
        });

        const dataTable = google.visualization.arrayToDataTable(chartDataArray);

        const options = {
            title: 'Indoor Climate History',
            titleTextStyle: { color: '#f8fafc', fontSize: 14, bold: true },
            backgroundColor: 'transparent',
            curveType: 'function',
            legend: {
                position: 'bottom',
                textStyle: { color: '#94a3b8' }
            },
            colors: ['#f97316', '#38bdf8'],
            hAxis: {
                title: 'Time',
                titleTextStyle: { color: '#94a3b8' },
                textStyle: { color: '#94a3b8' },
                gridlines: { color: '#334155' },
                baselineColor: '#334155'
            },
            vAxis: {
                title: 'Measurement',
                titleTextStyle: { color: '#94a3b8' },
                textStyle: { color: '#94a3b8' },
                gridlines: { color: '#334155' },
                baselineColor: '#334155'
            }
        };

        const chart = new google.visualization.LineChart(document.getElementById('chart_div'));
        chart.draw(dataTable, options);

    } catch (error) {
        console.error("Error fetching data or drawing chart:", error);
    }
}

setInterval(fetchAndDrawChart, 30000);