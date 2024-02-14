// Function to update the metric dropdown
async function populateMetricDropdown(statementType, dropdownId = 'metric') {
    const response = await fetch(`Data/${statementType}.json`);
    const data = await response.json();
    const metricDropdown = document.getElementById(dropdownId);
    metricDropdown.innerHTML = ''; // Clear existing options

    const itemNames = Array.from(new Set(data.map(item => item['Item Name'])));
    itemNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        metricDropdown.appendChild(option);
    });
}

// Function to update the start and end period dropdowns
function updatePeriodDropdowns(isYearly, startPeriod = null) {
    const startPeriodDropdown = document.getElementById('startPeriod');
    const endPeriodDropdown = document.getElementById('endPeriod');

    if (startPeriod === null) {
        // If startPeriod is not provided, reset and populate startPeriodDropdown
        startPeriodDropdown.innerHTML = '';
        const periods = isYearly ? Array.from({ length: 14 }, (_, i) => 2010 + i) : 
                                 Array.from({ length: 56 }, (_, i) => `Q${(i % 4) + 1}_${Math.floor(2010 + i / 4)}`);
        periods.forEach(period => {
            const startOption = document.createElement('option');
            startOption.value = period;
            startOption.textContent = period;
            startPeriodDropdown.appendChild(startOption);
        });
    }

    // Update endPeriodDropdown based on startPeriod
    endPeriodDropdown.innerHTML = ''; // Clear existing options
    const selectedIndex = startPeriod ? startPeriodDropdown.selectedIndex : 0;
    for (let i = selectedIndex; i < startPeriodDropdown.options.length; i++) {
        const endOption = document.createElement('option');
        endOption.value = startPeriodDropdown.options[i].value;
        endOption.textContent = startPeriodDropdown.options[i].text;
        endPeriodDropdown.appendChild(endOption);
    }
}


function calculateCAGR(startValue, endValue, periods) {
    if (startValue <= 0 || periods <= 0) {
        return 'N/A';
    }
    return ((Math.pow(endValue / startValue, 1 / periods) - 1) * 100).toFixed(2) + '%';
}


// Function to perform the selected operation between two metrics
function performOperation(metric1, metric2, operation) {
    console.log(`Performing operation: ${operation} on ${metric1} and ${metric2}`);
    let result;
    switch (operation) {
        case 'percentageOf':
            result = (metric1 / metric2) * 100;
            break;
        case 'multiply':
            result = metric1 * metric2;
            break;
        case 'add':
            result = metric1 + metric2;
            break;
        case 'subtract':
            result = metric1 - metric2;
            break;
        default:
            result = 0;
    }
    console.log(`Result: ${result}`);
    return result;
}


// Modify the event listener for start period change
document.getElementById('startPeriod').addEventListener('change', (e) => {
    const isYearly = document.getElementById('periodicity').value === 'Yearly';
    updatePeriodDropdowns(isYearly, e.target.value);
});

// Ensure periodicity change updates both dropdowns
document.getElementById('periodicity').addEventListener('change', (e) => {
    const isYearly = e.target.value === 'Yearly';
    updatePeriodDropdowns(isYearly);
    // Re-trigger start period change event to update end period dropdown
    const startPeriod = document.getElementById('startPeriod').value;
    updatePeriodDropdowns(isYearly, startPeriod);
});

// Function to fetch data based on selections
async function fetchDataBasedOnSelections() {
    const statementType = document.getElementById('statementType').value;
    const metric = document.getElementById('metric').value;
    const startPeriod = document.getElementById('startPeriod').value;
    const endPeriod = document.getElementById('endPeriod').value;
    const isYearly = document.getElementById('periodicity').value === 'Yearly';

    const response = await fetch(`Data/${statementType}_${isYearly ? 'Y' : 'Q'}.json`);
    const data = await response.json();

    // Filter for the selected metric
    const filteredData = data.filter(item => item['Item Name'] === metric);

    // Create a range of years/quarters to include
    const periodRange = getPeriodRange(startPeriod, endPeriod, isYearly);

    // Check if Calculator Mode is active
    if (document.getElementById('calculatorModeToggle').checked) {
        const statementType2 = document.getElementById('statementType2').value;
        const metric2 = document.getElementById('metric2').value;
        const operation = document.getElementById('operation').value;

        // Fetch data for the second metric
        const response2 = await fetch(`Data/${statementType2}_${isYearly ? 'Y' : 'Q'}.json`);
        const data2 = await response2.json();
        const filteredData2 = data2.filter(item => item['Item Name'] === metric2);

        // Create a map for the second dataset for quick lookup
        const data2Map = new Map();
        filteredData2.forEach(item => data2Map.set(item['Bank'], item));

        // Combine the data from both metrics based on the selected operation
        return filteredData.map(item => {
            const matchingItem2 = data2Map.get(item['Bank']);
            if (!matchingItem2) {
                console.warn(`No matching data found for bank: ${item['Bank']}`);
                return item;
            }

            const newItem = {...item};
            periodRange.forEach(period => {
                const metric1 = parseFloat(item[period]);
                const metric2 = parseFloat(matchingItem2[period]);
                newItem[period] = isNaN(metric1) || isNaN(metric2) ? 'N/A' : performOperation(metric1, metric2, operation);
            });
            return newItem;
        });
    }

    return filteredData;
}


// Event listener for the Calculator Mode toggle
document.getElementById('calculatorModeToggle').addEventListener('change', async (e) => {
    const calculatorModeOptions = document.getElementById('calculatorModeOptions');
    if (e.target.checked) {
        calculatorModeOptions.style.display = 'block';

        // Populate statementType2 dropdown (you might need a separate function for this)
        // Assuming it has similar options as statementType
        const statementType2Dropdown = document.getElementById('statementType2');
        const statementTypeOptions = document.getElementById('statementType').innerHTML;
        statementType2Dropdown.innerHTML = statementTypeOptions;

        // Now populate the metric2 dropdown based on the selected statementType2
        const statementType2Value = statementType2Dropdown.value;
        await populateMetricDropdown(statementType2Value + (document.getElementById('periodicity').value === 'Yearly' ? '_Y' : '_Q'), 'metric2');
    } else {
        calculatorModeOptions.style.display = 'none';
    }
});

// Helper function to generate a range of periods
function getPeriodRange(start, end, isYearly) {
    if (isYearly) {
        const startYear = parseInt(start);
        const endYear = parseInt(end);
        return Array.from({ length: endYear - startYear + 1 }, (_, i) => (startYear + i).toString());
    } else {
        const startYear = parseInt(start.split('_')[1]);
        const endYear = parseInt(end.split('_')[1]);
        const startQuarter = parseInt(start.split('_')[0].substring(1));
        const endQuarter = parseInt(end.split('_')[0].substring(1));

        let periods = [];
        for (let year = startYear; year <= endYear; year++) {
            for (let quarter = 1; quarter <= 4; quarter++) {
                if (year > startYear && year < endYear) {
                    periods.push(`Q${quarter}_${year}`);
                } else if (year === startYear && quarter >= startQuarter && (year !== endYear || quarter <= endQuarter)) {
                    periods.push(`Q${quarter}_${year}`);
                } else if (year === endYear && quarter <= endQuarter && (year !== startYear || quarter >= startQuarter)) {
                    periods.push(`Q${quarter}_${year}`);
                }
            }
        }
        return periods;
    }
}



// Update Table Function MAIN FUNCTION
// Update Table Function
function updateTable(data, startPeriod, endPeriod) {
    // Get the table element
    const table = document.getElementById('dataTable');
    // Clear existing table data
    table.innerHTML = '<thead></thead><tbody></tbody>';

    // Get the table's thead and tbody
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    // Create header row
    const headerRow = document.createElement('tr');
    
    // Add 'Bank' as the first column
    const bankHeader = document.createElement('th');
    bankHeader.textContent = 'Bank';
    headerRow.appendChild(bankHeader);

    // Add only the relevant period columns
    const relevantPeriods = getPeriodRange(startPeriod, endPeriod, document.getElementById('periodicity').value === 'Yearly');
    relevantPeriods.forEach(period => {
        const th = document.createElement('th');
        th.textContent = period;
        headerRow.appendChild(th);
    });

    // Check if more than one period is selected for CAGR calculation
    const isMultiplePeriods = relevantPeriods.length > 1;
    if (isMultiplePeriods) {
        const cagrHeader = document.createElement('th');
        cagrHeader.textContent = 'CAGR Growth Rate';
        headerRow.appendChild(cagrHeader);
    }

    thead.appendChild(headerRow);

    // Initialize totals array for overall and peer totals
    let totals = new Array(relevantPeriods.length).fill(0);
    let peerTotals = new Array(relevantPeriods.length).fill(0);
    let bankCount = data.length;
    let peerBankCount = Math.min(5, bankCount);

    // Determine if average should be calculated instead of sum
    const isCalculatorMode = document.getElementById('calculatorModeToggle').checked;
    const isRatiosSelected = document.getElementById('statementType').value === 'Ratios';
    const calculateAverage = isCalculatorMode || isRatiosSelected;

    // Create data rows and calculate totals
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        const bankData = document.createElement('td');
        bankData.textContent = item['Bank'];
        row.appendChild(bankData);

        relevantPeriods.forEach((period, periodIndex) => {
            const td = document.createElement('td');
            let cellValue = parseFloat(item[period]) || 0;
            totals[periodIndex] += cellValue;
            if (index < 5) { 
                peerTotals[periodIndex] += cellValue;
            }
            td.textContent = formatNumber(cellValue);
            row.appendChild(td);
        });

        if (isMultiplePeriods) {
            const cagrData = document.createElement('td');
            const startValue = parseFloat(item[relevantPeriods[0]]) || 0;
            const endValue = parseFloat(item[relevantPeriods[relevantPeriods.length - 1]]) || 0;
            cagrData.textContent = calculateCAGR(startValue, endValue, relevantPeriods.length - 1);
            row.appendChild(cagrData);
        }

        tbody.appendChild(row);

        // Add class to the 10th row
        if (index === 9) { // Remember, index is 0-based
            row.classList.add("row-10th");
        }
    });

    // Calculate and append totals
    appendTotalRow(tbody, 'Peer Group', peerTotals, peerBankCount, calculateAverage);
    appendTotalRow(tbody, 'Industry', totals, bankCount, calculateAverage);

    // Calculate and append BSF Rankings
    appendRankingRow(tbody, 'BSF Ranking-Peer Group', data, 'Peer Group', relevantPeriods);
    appendRankingRow(tbody, 'BSF Ranking-Industry', data, 'Industry', relevantPeriods);

    // Calculate and append BSF Market Share
    appendMarketShareRow(tbody, 'BSF Market Share', data, relevantPeriods);
}

// [Rest of your helper functions like appendRankingRow, calculateBSFRanking, formatOrdinal, appendMarketShareRow, calculateBSFMarketShare, etc.]

// Function to append ranking row
function appendRankingRow(tbody, label, data, group, periods) {
    const rankingRow = document.createElement('tr');
    const labelCell = document.createElement('td');
    labelCell.textContent = label;
    rankingRow.appendChild(labelCell);

    periods.forEach(period => {
        const td = document.createElement('td');
        let ranking = calculateBSFRanking(data, group, period);
        td.innerHTML = ranking; // Set innerHTML instead of textContent
        rankingRow.appendChild(td);
    });

    tbody.appendChild(rankingRow);
}

// Function to calculate BSF's ranking and format with ordinal indicators
function calculateBSFRanking(data, group, period) {
    let sortedData;
    if (group === 'Peer Group') {
        sortedData = data.slice(0, 5);
    } else { // Industry
        sortedData = [...data];
    }
    sortedData.sort((a, b) => parseFloat(b[period]) - parseFloat(a[period]));

    for (let i = 0; i < sortedData.length; i++) {
        if (sortedData[i]['Bank'] === 'BSF') {
            return formatOrdinal(i + 1); // Ranking with ordinal format (1-indexed)
        }
    }
    return '-';
}

// Function to format number with ordinal indicator (1st, 2nd, 3rd, etc.)
function formatOrdinal(number) {
    const j = number % 10,
          k = number % 100;
    if (j == 1 && k != 11) {
        return number + "<sup>st</sup>";
    }
    if (j == 2 && k != 12) {
        return number + "<sup>nd</sup>";
    }
    if (j == 3 && k != 13) {
        return number + "<sup>rd</sup>";
    }
    return number + "<sup>th</sup>";
}

// Function to append market share row
function appendMarketShareRow(tbody, label, data, periods) {
    const marketShareRow = document.createElement('tr');
    const labelCell = document.createElement('td');
    labelCell.textContent = label;
    marketShareRow.appendChild(labelCell);

    periods.forEach(period => {
        const td = document.createElement('td');
        let marketShare = calculateBSFMarketShare(data, period);
        td.textContent = marketShare;
        marketShareRow.appendChild(td);
    });

    tbody.appendChild(marketShareRow);
}

// Function to calculate BSF's market share
function calculateBSFMarketShare(data, period) {
    let bsfValue = 0;
    let totalValue = 0;

    data.forEach(item => {
        let value = parseFloat(item[period]) || 0;
        totalValue += value;
        if (item['Bank'] === 'BSF') {
            bsfValue = value;
        }
    });

    if (totalValue === 0) return '0%'; // Avoid division by zero
    return ((bsfValue / totalValue) * 100).toFixed(2) + '%'; // Market share in percentage
}

// Add any additional helper functions like formatNumber, appendTotalRow if needed



function formatNumber(value) {
    if (value >= 200 && value > 0) {
        // Format as a rounded number with a comma and no decimal
        return Math.round(value).toLocaleString();
    } else {
        // Format as a number with two decimal places
        return value.toFixed(2) ;
    }
}


function appendTotalRow(tbody, baseLabel, totalsArray, count, calculateAverage) {
    const totalRow = document.createElement('tr');
    const totalHeader = document.createElement('td');

    // Add 'Avg' or 'Total' suffix based on the calculateAverage flag
    let labelSuffix = calculateAverage ? ' Average' : ' Total';
    totalHeader.textContent = baseLabel + labelSuffix;
    totalRow.appendChild(totalHeader);

    totalsArray.forEach(total => {
        const td = document.createElement('td');
        let value = calculateAverage ? total / count : total;
        td.textContent = formatNumber(value);
        totalRow.appendChild(td);
    });

    tbody.appendChild(totalRow);
}






// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    updatePeriodDropdowns(true); // Initialize period dropdowns
    populateMetricDropdown('Income_Statement_Y'); // Initialize metric dropdown
});

document.getElementById('statementType').addEventListener('change', (e) => {
    const statementType = e.target.value + (document.getElementById('periodicity').value === 'Yearly' ? '_Y' : '_Q');
    populateMetricDropdown(statementType);
});

document.getElementById('periodicity').addEventListener('change', (e) => {
    updatePeriodDropdowns(e.target.value === 'Yearly');
});

document.getElementById('fetchDataButton').addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Stop the event from propagating up the DOM

    
    console.log("Button clicked");

    const startPeriod = document.getElementById('startPeriod').value;
    const endPeriod = document.getElementById('endPeriod').value;
    const data = await fetchDataBasedOnSelections();
    console.log("Data fetched:", data);

    updateTable(data, startPeriod, endPeriod);
    console.log("Table updated");
});



// Event listener for the second statement type dropdown
document.getElementById('statementType2').addEventListener('change', (e) => {
    const statementType2 = e.target.value + (document.getElementById('periodicity').value === 'Yearly' ? '_Y' : '_Q');
    populateMetricDropdown(statementType2, 'metric2');
});