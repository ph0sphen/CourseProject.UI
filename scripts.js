const charts ={};

const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7045/indicator")
    .configureLogging(signalR.LogLevel.Information)
    .build();

async function start() {
    try {
        await connection.start();
        console.log("SignalR Connected.");
    } catch (err) {
        console.log(err);
        setTimeout(start, 5000);
    }
};


connection.onclose(async () => {
    await start();
});


start();

connection.on("receive", (id, value) =>
{
    console.log(`received value: ${value} for ID: ${id}`) ;
    const element = document.getElementById(id);
    if(element){
        element.textContent = value;
        setIndicatorValue(id,value);
    }
    else
    {
        console.warn(`Element with ID: ${id} not found`)
    }
})

document.getElementById('create-indicator-form').onsubmit = onFormSubmit;
document.getElementById('update-indicator-form').onsubmit = onFormUpdate;

getIndicators();

function getIndicators() {
    console.log('getIndicators');
    axios.get('https://localhost:7045/api/Indicator')
        .then(result => {
            console.log(result);

            result.data.forEach(indicator => {
                createIndicator(indicator.id,
                    indicator.name,
                    indicator.x,
                    indicator.y,
                    indicator.value,
                    indicator.unit,
                    indicator.indicatorValues)
            });
        })
}


function createIndicator(id, name, x, y, value, unit, values = []) {

    // console.log('createIndicators');
    const body = document.getElementsByTagName('body')[0];
    const child = document.createElement('div');

    child.className = 'indicator';
    child.style.left = `${x}px`;
    child.style.top = `${y}px`;

    const valueElement = document.createElement('p');
    valueElement.id = id;
    valueElement.textContent = value + unit;
    valueElement.className = 'indicator-value';

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    buttonContainer.style.display = 'none';

    const diagramButton = document.createElement('button');
    diagramButton.className = 'diagram-button';
    diagramButton.textContent = 'Diagram';

    diagramButton.setAttribute('chart-id', 'chart-' + id);
    diagramButton.onclick = onShowDiagramClick;

    const deleteButton = document.createElement('button');
    deleteButton.className = 'diagram-button';
    deleteButton.textContent = 'Delete';
    deleteButton.oneclick = (e) => onDelete(e, id);

    buttonContainer.appendChild(diagramButton);
    buttonContainer.appendChild(deleteButton);


    child.appendChild(valueElement);
    child.appendChild(buttonContainer);

    valueElement.onclick = () =>{
        buttonContainer.style.display = buttonContainer.style.display === 'none'? 'block':'none';
    }

    const chart = createChart(id, name, child, values);
    // charts[id] = chart;

    body.appendChild(child);
}

document.getElementById('backgroundArea').onclick = (e) => {
    
    document.getElementById('x').value = e.x;
    document.getElementById('y').value = e.y;
}

function onFormSubmit(e) 
{
    console.log("OnFormSubmit");
    e.preventDefault();

    if (e.submitter.value === 'Create') {
        console.log("e.submitter.value");
        tryNewIndicator(e.target[0].value, e.target[1].value, e.target[2].value, e.target[3].value, e.target[4].value,)
    }
}

function tryNewIndicator(name, value, unit, x, y) {
    axios.post('https://localhost:7045/api/Indicator', {
        name: name,
        description: name,
        x,
        y,
        value: value,
        unit
    })
        .then(result => {
            createIndicator(result.data, name, x, y, value, unit);
        });
}

function setIndicatorValue(id,value) 
{
    const element = document.getElementById(id);
    element.textContent = value;

    if(charts[id]){
        const chart = charts[id];

        const numericValue = parseFloat(value.replace(',','.'));

        if(isNaN(numericValue)){
            console.error("Numeric Value is not valid: ", numericValue);
        }

        chart.data.datasets[0].data.push(numericValue);
        chart.data.labels.push(chart.data.labels.length);

        chart.update();
    }
    else{
        console.warn(`Chart for ID ${id} not found`);
    }
}


function onFormUpdate(e) 
{
    e.preventDefault();
    if (e.submitter.value === 'Update') 
        {
            
        const param1 = e.target[0].value;
        const param2 = e.target[1].value;

        updateTargetValue(param1, param2);
    }
    
}

function changeBackgroundImage(id)
{
    const element = document.getElementsByClassName('background-image')[0];
    element.scr = 'https://localhost:7045/api/BackgroundImage/10' + id;
    console.log(element)
}

document.getElementById('changeBg').addEventListener('submit', function(event){
    event.preventDefault();
    const value = document.getElementById('changeBgNumber').value;
    changeBackgroundImage(value);
});

document.getElementById("imageForm").addEventListener("submit", function(event){
    event.preventDefault();

    var formData = new FormData();
    var fileInput = document.getElementById("imageInput").files[0];

    if(fileInput)
    {
        formData.append('image', fileInput);
        axios.post('https://localhost:7045/api/backgroundimage/upload-image', formData)
        .then(result =>{
            console.log('Image upload successfully')
        })
        .catch(error =>{
            console.error("Error:", error);
        });
    }
    else{
        console.error("No file selected")
    }
});

function onShowDiagramClick(e){
    const chartId = e.target.getAttribute('chart-id');
    const diagramElement = document.getElementById(chartId);

    if(diagramElement){
        console.log("Diagram element found", diagramElement);

        const style = diagramElement.style;
        style.display = style.display === 'none' || style.display === ''? 'block': 'none';
        console.log("Diagram visibility toggled");
    }
    else{
        console.log("Diagram element not found");
    }
}

function onDelete(e, id){
    axios.delete(`https://localhost:7045/api/indicator/${id}`);
    e.target.preventElement.remove();
}

function createChart(id, chartName, parentElement, values){
    console.log("Creating chart....");

    const ctx = document.createElement('canvas');
    ctx.id = 'chart-' + id;
    ctx.className = 'diagram';
    ctx.style.display = 'none';

    if(!values || values.length === 0){
        console.error("No values provided for chart.")
        return;
    }

    parentElement.appendChild(ctx);

    const numericValues = values.map(value => parseFloat(value.replace(',','.')));

    if(numericValues.some(isNaN)){
        console.error("One or more values are not valid numbers:", numericValues);
        return;
    }

    const data ={
        labels: numericValues.map((_,i) => i),
        datasets:[{
            label: chartName,
            data: numericValues,
            borderColor: 'rgb(250,20,20',
            fill:false,
            tension: 0.4
        }]
    };

    const plugin ={
        id:'customCanvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
            const {ctx} = chart;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = options.color || '#099ffff';
            ctx.fillRect(0,0,chart.width, chart.height);
            ctx.restore();
        }
    }

    const options ={
        animation: true,
        responsive: true,
        plugins: {
            customCanvasBackgroundColor: {color: '#f0e1ed'}
        },
        scales: {
            y:{
                min: 0,
                max: 160
            }
            
        }
        
    };
    function createReport() {
        
        const table = document.getElementById('logTable');
        const rows = table.querySelectorAll('tr');
        
        
        let reportContent = "Log Report\n\n";
        
        rows.forEach((row, index) => {
            const columns = row.querySelectorAll('th, td');
            let rowData = [];
            columns.forEach(cell => rowData.push(cell.textContent.trim()));
            if (index === 0) {
                reportContent += `Headers: ${rowData.join(", ")}\n`;
            } else {
                reportContent += `Row ${index}: ${rowData.join(", ")}\n`;
            }
        });
    
        
        const blob = new Blob([reportContent], { type: "text/plain" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "log_report.txt";
        document.body.appendChild(link);
    
        link.click();
        document.body.removeChild(link);
    
        
        toastr.success("Report created successfully!");
    }

    document.getElementById('crR').addEventListener("click", createReport)
    
    function exportData() {
        
        const table = document.getElementById('logTable');
        const rows = table.querySelectorAll('tr');
        
                let csvContent = "data:text/csv;charset=utf-8,";
            
        rows.forEach(row => {
            const columns = row.querySelectorAll('th, td');
            let rowData = [];
            columns.forEach(cell => rowData.push(cell.textContent.trim()));
            csvContent += rowData.join(",") + "\r\n";
        });
    
       
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'log_data.csv');
        document.body.appendChild(link);
    
        link.click();
        document.body.removeChild(link);
    
        
        toastr.success("Data exported successfully!");
    }

    document.getElementById('exDa').addEventListener("click", exportData)
    
   

    const chart = new Chart(ctx, {type: 'line', data, options, plugins:[plugin]});
    charts[id] = chart;

    console.log("Chart created:", ctx.id)
    return chart;
}

        

