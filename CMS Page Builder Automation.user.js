// ============================================================================
// SECTION 1: HEADER & CONFIGURATION
// ============================================================================
// ==UserScript==
// @name         CMS Page Builder Automation - Fixed v5
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Automate bulk page creation - Fixed sidebar & section handling
// @match        https://cms.dealeron.com/dash/dist/cms/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Global flag for stopping automation mid-process
    let shouldCancel = false;

    // Platform page mapping: section name → dropdown value
    const platformPageMapping = {
        'new': '3',                // New Inventory - Search Inventory
        'pre-owned': '11',         // Used Inventory - Search Inventory
        'finance': '26',           // Finance - Finance
        'service & parts': '20',   // Service - Service & Parts
        'about us': '31'           // About Us - About Us
    };

    // ========================================================================
// SECTION 2: STYLING & UI ELEMENTS (UPDATED - Section name field removed)
// ========================================================================

const styles = `
    #pageBuilderModal {
        display: none;
        position: fixed;
        z-index: 9999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
    }

    #pageBuilderModalContent {
        background-color: #fefefe;
        margin: 5% auto;
        padding: 25px;
        border: 1px solid #888;
        border-radius: 8px;
        width: 750px;
        max-width: 95%;
        max-height: 85vh;
        overflow-y: auto;
        position: relative;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #f0f0f0;
        padding-bottom: 10px;
    }

    .modal-header h2 {
        margin: 0;
        color: #333;
    }

    .close-modal {
        color: #aaa;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        line-height: 20px;
    }

    .close-modal:hover {
        color: #000;
    }

    .modal-body {
        padding: 10px 0;
    }

    .form-group {
        margin-bottom: 15px;
    }

    .form-group label {
        display: block;
        font-weight: bold;
        margin-bottom: 5px;
        color: #555;
    }

    .form-group textarea {
        width: 100%;
        min-height: 200px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: monospace;
        font-size: 13px;
        box-sizing: border-box;
    }

    .instructions {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
        font-size: 13px;
    }

    .instructions h4 {
        margin-top: 0;
        color: #28a745;
    }

    .instructions ul {
        margin: 10px 0;
        padding-left: 20px;
    }

    .instructions li {
        margin: 5px 0;
    }

    .modal-footer {
        margin-top: 20px;
        text-align: right;
        border-top: 2px solid #f0f0f0;
        padding-top: 15px;
        padding-bottom: 60px;
    }

    #progressLog {
        margin-top: 15px;
        padding: 10px;
        background: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 4px;
        max-height: 250px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 12px;
        display: none;
    }

    .log-entry {
        margin: 3px 0;
    }

    .log-success { color: #28a745; }
    .log-error { color: #dc3545; }
    .log-info { color: #17a2b8; }
    .log-warning { color: #ffc107; }

    .stop-button-container {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
    }

    #stopProcessBtn {
        background-color: #dc3545;
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 5px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        transition: background-color 0.3s;
    }

    #stopProcessBtn:hover {
        background-color: #c82333;
    }

    #stopProcessBtn:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
`;

// Inject CSS styles into document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Modal HTML template (UPDATED - Section name input REMOVED)
const modalHTML = `
    <div id="pageBuilderModal">
        <div id="pageBuilderModalContent">
            <div class="modal-header">
                <h2>Page Builder - Bulk Automation</h2>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="instructions">
                    <h4>📋 Instructions:</h4>
                    <ul>
                        <li>Copy <strong>5 columns</strong> from Excel</li>
                        <li><strong>Columns:</strong> Page Name | Slug | Page Section | Page Type | Page Status</li>
                        <li>Sections will be created automatically based on "Page Section" column</li>
                        <li>Non-Platform pages will be added to their respective sections</li>
                        <li><strong>Supported Page Types:</strong> Local Link, Custom Content, Custom Model Research Page, Custom Iframe</li>
                        <li><strong>Skipped Page Types:</strong> Platform Page</li>
                        <li><strong>Page Status:</strong> "Enabled" or "Sitemapped"</li>
                    </ul>
                </div>

                <div class="form-group">
                    <label for="excelData">Paste Excel Data (5 columns):</label>
                    <textarea id="excelData" placeholder="Paste your 5 columns from Excel here...&#10;Example:&#10;New Vehicles	searchnew.aspx	New	Local Link	Enabled&#10;Tax Benefits	section-179...	New	Local Link	Enabled&#10;Pre-owned Vehicles	searchused.aspx	Pre-Owned	Local Link	Enabled"></textarea>
                </div>

                <div id="progressLog"></div>
            </div>
            <div class="modal-footer">
                <button id="previewDataBtn" class="btn btn-info">Preview Data</button>
                <button id="startBulkProcessBtn" class="btn btn-success" disabled>Start Automation</button>
                <button id="cancelProcessBtn" class="btn btn-default">Cancel</button>
            </div>
        </div>
    </div>
    <div class="stop-button-container">
        <button id="stopProcessBtn" disabled>🛑 Stop Process</button>
    </div>
`;


    // ========================================================================
    // SECTION 3: UTILITY FUNCTIONS
    // ========================================================================

    /**
     * Wait for an element to appear in DOM with timeout
     * @param {string} selector - CSS selector for element
     * @param {number} timeout - Timeout in milliseconds (default 10000ms)
     * @returns {Promise} Resolves when element found or rejects on timeout
     */
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkElement() {
                if (shouldCancel) {
                    reject(new Error('Process cancelled by user'));
                    return;
                }

                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for element: ${selector}`));
                } else {
                    setTimeout(checkElement, 100);
                }
            }

            checkElement();
        });
    }

    /**
     * Trigger change events on form element to notify Vue.js
     * @param {HTMLElement} element - Form element to trigger change on
     */
    function triggerChange(element) {
        const event = new Event('change', { bubbles: true });
        element.dispatchEvent(event);
        const inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);
    }

    /**
     * Log message to progress log with timestamp and color coding
     * @param {string} message - Message to log
     * @param {string} type - Log type: 'info', 'success', 'error', 'warning'
     */
    function log(message, type = 'info') {
        const progressLog = document.getElementById('progressLog');
        progressLog.style.display = 'block';
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        progressLog.appendChild(entry);
        progressLog.scrollTop = progressLog.scrollHeight;
        console.log(message);
    }

    /**
     * Parse tab-separated Excel data from textarea
     * @param {string} rawData - Raw pasted data from Excel
     * @returns {Array} Array of page objects with properties: pageName, slug, section, pageType, status
     */
    function parseExcelData(rawData) {
        const lines = rawData.trim().split('\n');
        const pages = [];

        for (let line of lines) {
            if (!line.trim()) continue;
            const columns = line.split('\t').map(col => col.trim());
            if (columns.length >= 5) {
                pages.push({
                    pageName: columns[0],
                    slug: columns[1],
                    section: columns[2],
                    pageType: columns[3],
                    status: columns[4]
                });
            }
        }

        return pages;
    }

    // ========================================================================
    // SECTION 4: MODAL MANAGEMENT
    // ========================================================================

    /**
     * Add "Page Builder" button to admin panel if not already present
     */
    function addPageBuilderButton() {
        if (document.getElementById('pageBuilder')) {
            return;
        }

        const adminButtons = document.getElementById('adminButtons');

        if (adminButtons) {
            const viewDeletedBtn = document.getElementById('viewDeleted');

            if (viewDeletedBtn) {
                const pageBuilderBtn = document.createElement('button');

                pageBuilderBtn.setAttribute('data-v-7188041b', '');
                pageBuilderBtn.setAttribute('name', 'pageBuilder');
                pageBuilderBtn.setAttribute('id', 'pageBuilder');
                pageBuilderBtn.setAttribute('type', 'button');
                pageBuilderBtn.className = 'btn btn-success';
                pageBuilderBtn.textContent = 'Page Builder';

                pageBuilderBtn.addEventListener('click', function() {
                    openModal();
                });

                viewDeletedBtn.insertAdjacentElement('afterend', pageBuilderBtn);

                console.log('Page Builder button added successfully');
            }
        }
    }

    /**
     * Create modal if not already created and attach event listeners
     */
    function createModal() {
        if (!document.getElementById('pageBuilderModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            document.querySelector('.close-modal').addEventListener('click', closeModal);
            document.getElementById('cancelProcessBtn').addEventListener('click', closeModal);
            document.getElementById('previewDataBtn').addEventListener('click', previewData);
            document.getElementById('startBulkProcessBtn').addEventListener('click', startBulkProcess);
            document.getElementById('stopProcessBtn').addEventListener('click', stopProcess);
        }
    }

    /**
     * Open modal and reset state
     */
    function openModal() {
        createModal();
        document.getElementById('pageBuilderModal').style.display = 'block';
        document.getElementById('progressLog').innerHTML = '';
        document.getElementById('progressLog').style.display = 'none';
        document.getElementById('startBulkProcessBtn').disabled = true;
        shouldCancel = false;
        document.getElementById('stopProcessBtn').disabled = true;
    }

    /**
     * Close modal
     */
    function closeModal() {
        document.getElementById('pageBuilderModal').style.display = 'none';
    }

    /**
     * Stop automation process by setting cancel flag
     */
    function stopProcess() {
        shouldCancel = true;
        document.getElementById('stopProcessBtn').disabled = true;
        log('⛔ Process stopped by user', 'error');
    }

    // ========================================================================
// SECTION 5: SIDEBAR & FORM DETECTION FUNCTIONS (UPDATED - Longer timeouts)
// ========================================================================

/**
 * Wait for sidebar to open by checking visibility of form elements
 * UPDATED: Increased polling from 20x to 30x with 500ms intervals = up to 15 seconds
 */
async function waitForSidebarToOpen() {
    log('Waiting for sidebar to open...', 'info');

    for (let i = 0; i < 30; i++) {  // CHANGED: from 20 to 30 iterations
        await new Promise(resolve => setTimeout(resolve, 500));  // CHANGED: from 250ms to 500ms

        const selectPageType = document.getElementById('selectPageType');
        if (selectPageType && selectPageType.offsetParent !== null) {
            log('✓ Sidebar opened', 'success');
            return true;
        }
    }

    throw new Error('Sidebar did not open in time (waited 15 seconds)');
}

/**
 * Wait for sidebar to close by checking visibility of form elements
 * UPDATED: Increased polling from 10x to 20x with 500ms intervals = up to 10 seconds
 */
async function waitForSidebarToClose() {
    log('Waiting for sidebar to close...', 'info');

    for (let i = 0; i < 20; i++) {  // CHANGED: from 10 to 20 iterations
        await new Promise(resolve => setTimeout(resolve, 500));  // CHANGED: from 250ms to 500ms

        const selectPageType = document.getElementById('selectPageType');
        if (!selectPageType || selectPageType.offsetParent === null) {
            log('✓ Sidebar closed', 'success');
            return true;
        }
    }

    log('⚠ Sidebar still open, proceeding anyway', 'warning');
    return true;
}

/**
 * Close error popups that appear when duplicate URLs or errors occur
 * Looks for and clicks "Ok" or "Close" buttons
 */
async function closeErrorPopup() {
    await new Promise(resolve => setTimeout(resolve, 500));

    const alertButtons = document.querySelectorAll('button[class*="btn"]');
    for (let btn of alertButtons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('ok') || text.includes('close') || text.includes('yes')) {
            if (btn.offsetParent !== null) {
                btn.click();
                log('⚠ Closed error popup - continuing', 'warning');
                await new Promise(resolve => setTimeout(resolve, 500));
                break;
            }
        }
    }
}


    // ========================================================================
    // SECTION 6: PLATFORM PAGE CREATION
    // ========================================================================

    /**
     * Create a Platform Page
     * Process: Select type → Select platform page → Update slug → Set visibility → Check Add Another → Submit
     * @param {Object} pageData - Page data object with pageName, slug, section, pageType, status
     * @param {boolean} isLast - Whether this is the last page in the batch
     */
    async function createPlatformPage(pageData, isLast) {
        if (shouldCancel) throw new Error('Process cancelled by user');

        log(`Creating Platform Page: ${pageData.section}`, 'info');

        await waitForElement('#selectPageType');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 1: Select Platform Page (value 0)
        const pageTypeSelect = document.getElementById('selectPageType');
        pageTypeSelect.value = '0';
        triggerChange(pageTypeSelect);
        log('✓ Selected Platform Page', 'success');

        // Wait for dropdown to load after page type selection
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Select platform page from dropdown based on section mapping
        const sectionKey = pageData.section.toLowerCase();
        const sourceId = platformPageMapping[sectionKey];

        const sourceDropdown = document.getElementById('sourceIdDropDown');
        if (sourceDropdown && sourceId) {
            sourceDropdown.value = sourceId;
            triggerChange(sourceDropdown);
            log(`✓ Selected: ${pageData.section}`, 'success');
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 3: Update slug field with data from Excel
        const urlInput = document.querySelector('input[name="vanityPath"]');
        if (urlInput) {
            urlInput.value = pageData.slug;
            urlInput.dispatchEvent(new Event('input', { bubbles: true }));
            log(`✓ Updated slug: ${pageData.slug}`, 'success');
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 4: Set visibility based on status (Enabled or Sitemapped)
        const visibilityValue = pageData.status.toLowerCase().includes('sitemap') ? 'SitemapOnly' : 'Enabled';
        const visibilityRadio = document.querySelector(`input[name="visibility"][value="${visibilityValue}"]`);
        if (visibilityRadio) {
            visibilityRadio.checked = true;
            log(`✓ Set visibility: ${visibilityValue}`, 'success');
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 5: Check "Add Another" checkbox if not last page
        if (!isLast) {
            const addAnotherCheckbox = document.getElementById('addAnotherPage');
            if (addAnotherCheckbox) {
                addAnotherCheckbox.checked = true;
                log('✓ Checked "Add Another"', 'success');
            }
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 6: Click "Add Platform Page" submit button
        const addBtn = document.querySelector('input[type="submit"][value="Add Platform Page"]');
        if (addBtn) {
            addBtn.click();
            log('✓ Clicked Add Platform Page', 'success');
        }

        // Handle any error popups that appear
        await closeErrorPopup();

        // Wait for sidebar to close before moving to next page
        if (!isLast) {
            await waitForSidebarToClose();
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    // ========================================================================
    // SECTION 7: CUSTOM CONTENT PAGE CREATION
    // ========================================================================

    /**
     * Create a Custom Content Page
     * Process: Select type → Fill title → Fill slug → Set visibility → Check Add Another → Submit
     * @param {Object} pageData - Page data object with pageName, slug, section, pageType, status
     * @param {boolean} isLast - Whether this is the last page in the batch
     */
    async function createCustomContentPage(pageData, isLast) {
        if (shouldCancel) throw new Error('Process cancelled by user');

        log(`Creating Custom Content: ${pageData.pageName}`, 'info');

        await waitForElement('#selectPageType');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 1: Select Custom Content (value 1)
        const pageTypeSelect = document.getElementById('selectPageType');
        pageTypeSelect.value = '1';
        triggerChange(pageTypeSelect);
        log('✓ Selected Custom Content', 'success');

        // Wait for form fields to load after page type selection
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Fill in Title field with page name from Excel
        const titleInput = document.querySelector('input[name="page_name"]');
        if (titleInput) {
            titleInput.value = pageData.pageName;
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            log(`✓ Entered title: ${pageData.pageName}`, 'success');
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 3: Fill in slug (URL) field with slug from Excel
        const urlInput = document.querySelector('input[name="vanityPath"]');
        if (urlInput) {
            urlInput.value = pageData.slug;
            urlInput.dispatchEvent(new Event('input', { bubbles: true }));
            log(`✓ Entered URL: ${pageData.slug}`, 'success');
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 4: Set visibility based on status (Enabled or Sitemapped)
        const visibilityValue = pageData.status.toLowerCase().includes('sitemap') ? 'SitemapOnly' : 'Enabled';
        const visibilityRadio = document.querySelector(`input[name="visibility"][value="${visibilityValue}"]`);
        if (visibilityRadio) {
            visibilityRadio.checked = true;
            log(`✓ Set visibility: ${visibilityValue}`, 'success');
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 5: Check "Add Another" checkbox if not last page
        if (!isLast) {
            const addAnotherCheckbox = document.getElementById('addAnotherPage');
            if (addAnotherCheckbox) {
                addAnotherCheckbox.checked = true;
                log('✓ Checked "Add Another"', 'success');
            }
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 6: Click "Add Page" submit button
        const addBtn = document.querySelector('input[type="submit"][value="Add Page"]');
        if (addBtn) {
            addBtn.click();
            log('✓ Clicked Add Page', 'success');
        }

        // Handle any error popups that appear
        await closeErrorPopup();

        // Wait for sidebar to close before moving to next page
        if (!isLast) {
            await waitForSidebarToClose();
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    // ========================================================================
    // SECTION 8: SECTION & PAGE NAVIGATION
    // ========================================================================

    /**
     * Click the (Add Page) link in the newly created section
     * This opens the sidebar form for adding pages to the section
     */
    async function clickAddPageInSection() {
        if (shouldCancel) throw new Error('Process cancelled by user');

        log('Looking for (Add Page) link...', 'info');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const addPageLinks = document.querySelectorAll('a[id^="addPage-"]');

        if (addPageLinks.length > 0) {
            // Click the most recent (last) Add Page link
            const lastLink = addPageLinks[addPageLinks.length - 1];
            lastLink.click();
            log('✓ Clicked (Add Page) link', 'success');

            // Wait for sidebar to open after clicking
            await waitForSidebarToOpen();
        } else {
            throw new Error('(Add Page) link not found');
        }
    }

    // ========================================================================
// SECTION 9: DATA VALIDATION & PREVIEW (UPDATED - Shows sections grouped)
// ========================================================================

/**
 * Preview parsed data before starting automation
 * Shows data grouped by section and enables Start button if valid
 */
function previewData() {
    const rawData = document.getElementById('excelData').value;

    if (!rawData.trim()) {
        alert('Please paste data first!');
        return;
    }

    const pages = parseExcelData(rawData);

    if (pages.length === 0) {
        alert('No valid data found.');
        return;
    }

    // Count unique sections
    const uniqueSections = [...new Set(pages.map(p => p.section))];

    // Count pages by type
    const platformCount = pages.filter(p => p.pageType.toLowerCase().includes('platform')).length;
    const customContentCount = pages.filter(p => !p.pageType.toLowerCase().includes('platform')).length;

    // Build preview message
    let previewMessage = `✓ Data validated!\n\n`;
    previewMessage += `Total Pages: ${pages.length}\n`;
    previewMessage += `Unique Sections: ${uniqueSections.length}\n`;
    previewMessage += `├─ Sections: ${uniqueSections.join(', ')}\n\n`;
    previewMessage += `Page Types:\n`;
    previewMessage += `├─ Non-Platform pages (will be created): ${customContentCount}\n`;
    previewMessage += `└─ Platform pages (will be skipped): ${platformCount}\n`;

    document.getElementById('startBulkProcessBtn').disabled = false;
    alert(previewMessage);
}


// ========================================================================
// SECTION 10: MAIN AUTOMATION PROCESS (COMPLETELY REVISED - Multi-section)
// ========================================================================

/**
 * Main automation orchestration function
 * Groups pages by section → Creates each section → Adds pages to section
 * Non-Platform pages only (Platform pages are skipped)
 */
async function startBulkProcess() {
    const rawData = document.getElementById('excelData').value;

    // Validate input
    if (!rawData.trim()) {
        alert('Please paste Excel data first!');
        return;
    }

    const pages = parseExcelData(rawData);

    if (pages.length === 0) {
        alert('No valid data found.');
        return;
    }

    // Get unique sections in order of appearance
    const sectionsMap = new Map();
    pages.forEach(page => {
        if (!sectionsMap.has(page.section)) {
            sectionsMap.set(page.section, []);
        }
        sectionsMap.get(page.section).push(page);
    });

    const uniqueSections = Array.from(sectionsMap.keys());

    log(`📊 Found ${uniqueSections.length} sections: ${uniqueSections.join(', ')}`, 'info');
    log(`📄 Total pages: ${pages.length}`, 'info');

    // Disable buttons and enable stop button
    document.getElementById('startBulkProcessBtn').disabled = true;
    document.getElementById('previewDataBtn').disabled = true;
    document.getElementById('stopProcessBtn').disabled = false;
    shouldCancel = false;

    try {
        // MAIN LOOP: Process each section
        for (let sectionIndex = 0; sectionIndex < uniqueSections.length; sectionIndex++) {
            if (shouldCancel) throw new Error('Process cancelled by user');

            const currentSectionName = uniqueSections[sectionIndex];
            const sectionPages = sectionsMap.get(currentSectionName);

            // Filter out Platform pages for this section
            const pagesToCreate = sectionPages.filter(p => !p.pageType.toLowerCase().includes('platform'));
            const platformPagesSkipped = sectionPages.length - pagesToCreate.length;

            if (pagesToCreate.length === 0) {
                log(`\n⏭️  SKIPPING SECTION "${currentSectionName}" - All pages are Platform type`, 'warning');
                continue;
            }

            log(`\n${'='.repeat(70)}`, 'info');
            log(`SECTION ${sectionIndex + 1}/${uniqueSections.length}: "${currentSectionName}"`, 'info');
            log(`Pages to create: ${pagesToCreate.length} | Platform pages skipped: ${platformPagesSkipped}`, 'info');
            log(`${'='.repeat(70)}`, 'info');

            // STEP 1: CREATE SECTION (Local Link with New Inventory)
            log(`\nCreating section "${currentSectionName}"...`, 'info');

            const addSectionBtn = document.querySelector('#addSection input[type="button"]');
            if (!addSectionBtn) {
                throw new Error('Add Section button not found');
            }

            addSectionBtn.click();
            log('✓ Clicked Add Section', 'success');

            // Wait for sidebar to open
            await waitForSidebarToOpen();

            // Select Local Link (value 2)
            const pageTypeSelect = document.getElementById('selectPageType');
            pageTypeSelect.value = '2';
            triggerChange(pageTypeSelect);
            log('✓ Selected Local Link', 'success');

            await new Promise(resolve => setTimeout(resolve, 500));

            // Select New Inventory (value 1) for section type
            const sectionTypeSelect = document.querySelector('select[name="sectiontypeid"]');
            if (sectionTypeSelect) {
                sectionTypeSelect.value = '1';
                triggerChange(sectionTypeSelect);
                log('✓ Selected New Inventory', 'success');
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Enter section name (from Page Section column)
            const titleInput = document.querySelector('input[name="page_name"]');
            if (titleInput) {
                titleInput.value = currentSectionName;
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                log(`✓ Entered section name: "${currentSectionName}"`, 'success');
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Click "Add Page" to create section
            const addPageBtn = document.querySelector('input[type="submit"][value="Add Page"]');
            if (addPageBtn) {
                addPageBtn.click();
                log('✓ Section created', 'success');
            }

            // Close any error popups
            await closeErrorPopup();
            await waitForSidebarToClose();

            // Click (Add Page) link in the new section to start adding pages
            await clickAddPageInSection();

            // STEP 2: ADD ALL PAGES TO THIS SECTION
            log(`\n--- Adding ${pagesToCreate.length} pages to section "${currentSectionName}" ---`, 'info');

            for (let pageIndex = 0; pageIndex < pagesToCreate.length; pageIndex++) {
                if (shouldCancel) throw new Error('Process cancelled by user');

                const pageData = pagesToCreate[pageIndex];
                const isLast = (pageIndex === pagesToCreate.length - 1);
                const isLastSection = (sectionIndex === uniqueSections.length - 1);

                log(`\n  Page ${pageIndex + 1}/${pagesToCreate.length}: ${pageData.pageName}`, 'info');

                try {
                    // Determine page type and create accordingly
                    const pageTypeLower = pageData.pageType.toLowerCase();

                    // SKIP Platform pages
                    if (pageTypeLower.includes('platform')) {
                        log(`  ⏭️  SKIPPED (Platform Page)`, 'warning');
                        continue;
                    }

                    // Handle different non-Platform page types
                    if (pageTypeLower.includes('custom content')) {
                        // Custom Content page
                        await createCustomContentPage(pageData, isLast && isLastSection);
                    } else if (pageTypeLower.includes('local link')) {
                        // Local Link page - treat similar to Custom Content
                        await createCustomContentPage(pageData, isLast && isLastSection);
                    } else if (pageTypeLower.includes('custom model research') ||
                               pageTypeLower.includes('custom iframe')) {
                        // Custom Model Research Page or Custom Iframe - treat as Custom Content
                        await createCustomContentPage(pageData, isLast && isLastSection);
                    } else {
                        // Default: treat as Custom Content
                        log(`  ⚠ Unknown type "${pageData.pageType}", treating as Custom Content`, 'warning');
                        await createCustomContentPage(pageData, isLast && isLastSection);
                    }

                    // After each page (except last of section), click Add Page link to reopen sidebar
                    if (!isLast) {
                        await clickAddPageInSection();
                    }

                } catch (pageError) {
                    log(`  ⚠ Error: ${pageError.message}`, 'error');
                }
            }

            log(`\n✓ Completed section "${currentSectionName}"`, 'success');
        }

        log(`\n${'='.repeat(70)}`, 'info');
        log('🎉 All sections and pages processed successfully!', 'success');
        log(`${'='.repeat(70)}`, 'info');
        alert('✅ Bulk page creation completed!\n\nAll sections created with their respective pages.');

    } catch (error) {
        if (error.message !== 'Process cancelled by user') {
            log(`\n❌ Error: ${error.message}`, 'error');
            alert('Error: ' + error.message);
        }
    } finally {
        // Re-enable buttons
        document.getElementById('startBulkProcessBtn').disabled = false;
        document.getElementById('previewDataBtn').disabled = false;
        document.getElementById('stopProcessBtn').disabled = true;
    }
}

    // ========================================================================
    // SECTION 11: INITIALIZATION & EVENT LISTENERS
    // ========================================================================

    // Initialize: Add Page Builder button
    addPageBuilderButton();

    // Watch for DOM changes and reinitialize button if page reloads
    const observer = new MutationObserver(function(mutations) {
        addPageBuilderButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Listen for hash changes (Vue router navigation)
    window.addEventListener('hashchange', function() {
        setTimeout(addPageBuilderButton, 500);
    });

})();
