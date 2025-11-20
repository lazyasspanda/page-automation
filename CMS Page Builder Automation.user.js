// ============================================================================
// SECTION 1: HEADER & CONFIGURATION (FIXED - Working GitHub Updates)
// ============================================================================
// ==UserScript==
// @name         CMS Page Builder Automation - Multi-Section
// @namespace    http://tampermonkey.net/
// @version      5.3
// @description  Automate bulk page creation - Multi-section with auto-updates
// @author       Page Builder Team
// @match        https://cms.dealeron.com/dash/dist/cms/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      raw.githubusercontent.com
// @updateURL    https://github.com/lazyasspanda/page-automation/raw/refs/heads/main/CMS%20Page%20Builder%20Automation.user.js
// @downloadURL  https://github.com/lazyasspanda/page-automation/raw/refs/heads/main/CMS%20Page%20Builder%20Automation.user.js
// @homepageURL  https://github.com/lazyasspanda/page-automation
// ==/UserScript==

(function() {
    'use strict';

    // ====================================================================
    // SECTION 0A: UPDATE CHECKING CONFIGURATION (FIXED)
    // ====================================================================

    const UPDATE_CONFIG = {
        CURRENT_VERSION: '5.3',
        GITHUB_URL: 'https://github.com/lazyasspanda/page-automation/raw/refs/heads/main/CMS%20Page%20Builder%20Automation.user.js',
        CHECK_INTERVAL: 24 * 60 * 60 * 1000,
    };

    /**
     * Check for script updates from GitHub using GM_xmlhttpRequest
     * FIXED: Uses Tampermonkey's native request method instead of fetch()
     */
    function checkForUpdates() {
        const checkBtn = document.getElementById('checkUpdatesBtn');
        if (!checkBtn) return;

        checkBtn.style.opacity = '0.6';
        checkBtn.innerHTML = '⟳ Checking...';

        GM_xmlhttpRequest({
            method: 'GET',
            url: UPDATE_CONFIG.GITHUB_URL + '?t=' + Date.now(),
            onload: function(response) {
                checkBtn.style.opacity = '1';

                if (response.status !== 200) {
                    console.log('[Update] GitHub request failed:', response.status);
                    showUpdateError(checkBtn);
                    return;
                }

                const scriptContent = response.responseText;
                const match = scriptContent.match(/@version\s+([0-9.]+)/);
                const latestVersion = match ? match[1] : null;

                console.log(`[Update] Current: v${UPDATE_CONFIG.CURRENT_VERSION}, GitHub: v${latestVersion}`);

                if (latestVersion && latestVersion !== UPDATE_CONFIG.CURRENT_VERSION) {
                    // UPDATE AVAILABLE
                    console.log(`[Update] ✓ New version ${latestVersion} available!`);
                    checkBtn.innerHTML = `✓ Update Available: v${latestVersion}`;
                    checkBtn.style.background = '#28a745';
                    checkBtn.style.cursor = 'pointer';
                    checkBtn.setAttribute('data-update-ready', 'true');

                    // Store update info
                    GM_setValue('updateAvailable', latestVersion);

                    alert(`[✓] Update Available!\n\nCurrent: v${UPDATE_CONFIG.CURRENT_VERSION}\nLatest: v${latestVersion}\n\nClick the button again to open the update link.`);
                } else {
                    // NO UPDATE NEEDED
                    console.log(`[Update] ✓ Already up to date (v${UPDATE_CONFIG.CURRENT_VERSION})`);
                    checkBtn.innerHTML = '✓ No Updates Available';
                    checkBtn.style.background = '#27ae60';
                    checkBtn.style.cursor = 'default';
                    checkBtn.setAttribute('data-update-ready', 'false');

                    alert(`[✓] You're up to date!\n\nVersion: v${UPDATE_CONFIG.CURRENT_VERSION}`);

                    setTimeout(() => {
                        checkBtn.innerHTML = '⟳ Check for Updates';
                        checkBtn.style.background = '#6c757d';
                        checkBtn.style.cursor = 'pointer';
                        checkBtn.removeAttribute('data-update-ready');
                    }, 3000);
                }
            },
            onerror: function(error) {
                console.log('[Update] Check failed:', error);
                showUpdateError(checkBtn);
            }
        });
    }

    /**
     * Show update check error
     */
    function showUpdateError(checkBtn) {
        checkBtn.style.opacity = '1';
        checkBtn.innerHTML = '✗ Check Failed';
        checkBtn.style.background = '#dc3545';
        checkBtn.setAttribute('data-update-ready', 'false');

        alert('[✗] Update check failed!\n\nPossible reasons:\n- No internet connection\n- GitHub is down\n- Firewall blocking connection\n\nPlease try again later.');

        setTimeout(() => {
            checkBtn.innerHTML = '⟳ Check for Updates';
            checkBtn.style.background = '#6c757d';
            checkBtn.removeAttribute('data-update-ready');
        }, 3000);
    }

    /**
     * Auto-check for updates on script load (silent check)
     * FIXED: Uses GM_xmlhttpRequest instead of fetch
     */
    function autoCheckForUpdates() {
        const lastCheckTime = GM_getValue('lastUpdateCheck', 0);
        const now = Date.now();

        if ((now - lastCheckTime) > UPDATE_CONFIG.CHECK_INTERVAL) {
            console.log('[Update] Running auto-check for updates');
            GM_setValue('lastUpdateCheck', now);

            GM_xmlhttpRequest({
                method: 'GET',
                url: UPDATE_CONFIG.GITHUB_URL + '?t=' + Date.now(),
                onload: function(response) {
                    if (response.status === 200) {
                        const scriptContent = response.responseText;
                        const match = scriptContent.match(/@version\s+([0-9.]+)/);
                        const latestVersion = match ? match[1] : null;

                        if (latestVersion && latestVersion !== UPDATE_CONFIG.CURRENT_VERSION) {
                            console.log(`[Update] New version available: v${latestVersion}`);
                            GM_setValue('updateAvailable', latestVersion);
                        }
                    }
                },
                onerror: function(error) {
                    console.log('[Update] Auto-check failed silently:', error);
                }
            });
        }
    }

    // Global flag for stopping automation mid-process
    let shouldCancel = false;

    // ====================================================================
    // PAGE TYPE MAPPING - Excel Text to CMS Dropdown Value
    // ====================================================================

    const pageTypeMapping = {
        'platform page': '0',
        'platform': '0',
        'custom content': '1',
        'local link': '2',
        'external link': '3',
        'custom content with inventory': '7',
        'custom iframe': '9',
        'iframe': '9',
        'custom model research page': '10',
        'model research': '10',
        'special listing page': '12',
        'specials listing': '12',
        'listing page': '12'
    };

    function getPageTypeValue(pageTypeText) {
        if (!pageTypeText) return null;

        const normalized = pageTypeText.toLowerCase().trim();

        if (pageTypeMapping[normalized]) {
            return pageTypeMapping[normalized];
        }

        for (const [key, value] of Object.entries(pageTypeMapping)) {
            if (normalized.includes(key) || key.includes(normalized)) {
                return value;
            }
        }

        return null;
    }

    const platformPageMapping = {
        'new': '3',
        'pre-owned': '11',
        'finance': '26',
        'service & parts': '20',
        'about us': '31'
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
            #checkUpdatesBtn {
        background-color: #6c757d;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        margin-right: 10px;
        transition: all 0.3s;
    }

    #checkUpdatesBtn:hover {
        background-color: #5a6268;
        transform: translateY(-2px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    #checkUpdatesBtn:active {
        transform: translateY(0);
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
                <button id="checkUpdatesBtn" class="btn" style="background-color: #6c757d; color: white; padding: 8px 12px; border-radius: 4px; font-size: 13px; margin-right: 10px; cursor: pointer; border: none;">⟳ Check for Updates</button>
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
            document.getElementById('startBulkProcessBtn').addEventListener('click', function() {
    // Show stop button when process starts
    document.getElementById('stopProcessBtn').style.display = 'block';
    startBulkProcess();
});
            document.getElementById('stopProcessBtn').addEventListener('click', stopProcess);
                        // Update check button listener
            document.getElementById('checkUpdatesBtn').addEventListener('click', function() {
                const btn = document.getElementById('checkUpdatesBtn');

                // If update is ready, open the link
                if (btn.getAttribute('data-update-ready') === 'true') {
                    console.log('[Update] Opening update link');
                    window.open(UPDATE_CONFIG.GITHUB_URL, '_blank');
                    return;
                }

                // Otherwise, perform manual check
                checkForUpdates();
            });

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
// SECTION 5: SIDEBAR & FORM DETECTION FUNCTIONS (UPDATED - Silent mode)
// ========================================================================

/**
 * Wait for sidebar to open by checking visibility of form elements
 * Increased polling: 30x with 500ms intervals = up to 15 seconds
 */
async function waitForSidebarToOpen() {
    log('Waiting for sidebar to open...', 'info');

    for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));

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
 * Increased polling: 20x with 500ms intervals = up to 10 seconds
 * UPDATED: Silently proceeds if sidebar doesn't close
 */
async function waitForSidebarToClose() {
    log('Waiting for sidebar to close...', 'info');

    for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const selectPageType = document.getElementById('selectPageType');
        if (!selectPageType || selectPageType.offsetParent === null) {
            log('✓ Sidebar closed', 'success');
            return true;
        }
    }

    // Silently proceed without warning (removed the warning log)
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
// SECTION 7: GENERIC PAGE CREATION (REWRITTEN - Supports All Page Types)
// ========================================================================

/**
 * Create a page of any supported type (except Platform)
 * Handles: Custom Content, Local Link, External Link, Custom Iframe,
 *          Custom Model Research Page, Specials Listing Page, Custom Content with Inventory
 *
 * @param {Object} pageData - Page data object with pageName, slug, section, pageType, status
 * @param {boolean} isLast - Whether this is the last page in the batch
 */
async function createGenericPage(pageData, isLast) {
    if (shouldCancel) throw new Error('Process cancelled by user');

    const pageTypeValue = getPageTypeValue(pageData.pageType);

    if (!pageTypeValue) {
        log(`⚠ Unknown page type: "${pageData.pageType}" - Skipping`, 'error');
        return;
    }

    // SKIP Platform Pages
    if (pageTypeValue === '0') {
        log(`⏭️  SKIPPING Platform Page: ${pageData.pageName}`, 'warning');
        return;
    }

    log(`Creating ${pageData.pageType}: ${pageData.pageName}`, 'info');

    await waitForElement('#selectPageType');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 1: Select Page Type from dropdown
    const pageTypeSelect = document.getElementById('selectPageType');
    pageTypeSelect.value = pageTypeValue;
    triggerChange(pageTypeSelect);
    log(`✓ Selected page type: ${pageData.pageType} (value: ${pageTypeValue})`, 'success');

    // Wait for form fields to load after page type selection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Fill in Title field with page name from Excel
    const titleInput = document.querySelector('input[name="page_name"]');
    if (titleInput) {
        titleInput.value = pageData.pageName;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        log(`✓ Entered title: ${pageData.pageName}`, 'success');
    } else {
        log(`⚠ Title field not found for ${pageData.pageType}`, 'warning');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Fill in URL/slug field
    const urlInput = document.querySelector('input[name="vanityPath"]');
    if (urlInput) {
        urlInput.value = pageData.slug;
        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
        log(`✓ Entered URL: ${pageData.slug}`, 'success');
    } else {
        log(`⚠ URL field not found for ${pageData.pageType}`, 'warning');
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
    } else {
        throw new Error('Add Page button not found');
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
// SECTION 10: MAIN AUTOMATION PROCESS (UPDATED - Section Mapping + Summary)
// ========================================================================

/**
 * Section mapping: Child sections → Parent sections
 * These sections will NOT create new sections, but add pages to parent sections
 */
const sectionMergeMapping = {
    'model research': 'About Us',
    'research': 'About Us',
    'body shop': 'Service & Parts',
    'service department': 'Service & Parts'
};

/**
 * Get the actual section name to use (handles merging)
 * @param {string} sectionName - Section name from Excel
 * @returns {string} Actual section name to use
 */
function getMappedSectionName(sectionName) {
    const normalized = sectionName.toLowerCase().trim();
    return sectionMergeMapping[normalized] || sectionName;
}

/**
 * Main automation orchestration function
 * Groups pages by section → Creates each section → Adds pages to section
 * Supports section merging and generates summary report
 */
async function startBulkProcess() {
    const rawData = document.getElementById('excelData').value;

    if (!rawData.trim()) {
        alert('Please paste Excel data first!');
        return;
    }

    const pages = parseExcelData(rawData);

    if (pages.length === 0) {
        alert('No valid data found.');
        return;
    }

    // Apply section mapping to pages
    pages.forEach(page => {
        page.mappedSection = getMappedSectionName(page.section);
    });

    // Group pages by MAPPED section
    const sectionsMap = new Map();
    pages.forEach(page => {
        if (!sectionsMap.has(page.mappedSection)) {
            sectionsMap.set(page.mappedSection, []);
        }
        sectionsMap.get(page.mappedSection).push(page);
    });

    const uniqueSections = Array.from(sectionsMap.keys());

    log(`📊 Found ${uniqueSections.length} sections: ${uniqueSections.join(', ')}`, 'info');
    log(`📄 Total pages: ${pages.length}`, 'info');

    // Summary tracking
    const summary = {
        totalPages: pages.length,
        successCount: 0,
        skipCount: 0,
        failCount: 0,
        failedPages: []
    };

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
            const pagesToCreate = sectionPages.filter(p => {
                const typeValue = getPageTypeValue(p.pageType);
                if (!typeValue || typeValue === '0') {
                    summary.skipCount++;
                    return false;
                }
                return true;
            });

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

            await waitForSidebarToOpen();

            const pageTypeSelect = document.getElementById('selectPageType');
            pageTypeSelect.value = '2'; // Local Link
            triggerChange(pageTypeSelect);
            log('✓ Selected Local Link', 'success');

            await new Promise(resolve => setTimeout(resolve, 500));

            const sectionTypeSelect = document.querySelector('select[name="sectiontypeid"]');
            if (sectionTypeSelect) {
                sectionTypeSelect.value = '1'; // New Inventory
                triggerChange(sectionTypeSelect);
                log('✓ Selected New Inventory', 'success');
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            const titleInput = document.querySelector('input[name="page_name"]');
            if (titleInput) {
                titleInput.value = currentSectionName;
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                log(`✓ Entered section name: "${currentSectionName}"`, 'success');
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            const addPageBtn = document.querySelector('input[type="submit"][value="Add Page"]');
            if (addPageBtn) {
                addPageBtn.click();
                log('✓ Section created', 'success');
            }

            await closeErrorPopup();
            await waitForSidebarToClose();
            await clickAddPageInSection();

            // STEP 2: ADD ALL PAGES TO THIS SECTION
            log(`\n--- Adding ${pagesToCreate.length} pages to section "${currentSectionName}" ---`, 'info');

            for (let pageIndex = 0; pageIndex < pagesToCreate.length; pageIndex++) {
                if (shouldCancel) throw new Error('Process cancelled by user');

                const pageData = pagesToCreate[pageIndex];
                const isLast = (pageIndex === pagesToCreate.length - 1);
                const isLastSection = (sectionIndex === uniqueSections.length - 1);

                log(`\n  Page ${pageIndex + 1}/${pagesToCreate.length}: ${pageData.pageName} (${pageData.pageType})`, 'info');

                try {
                    // Create page using generic function (handles all types)
                    await createGenericPage(pageData, isLast && isLastSection);
                    summary.successCount++;

                    // After each page (except last of section), click Add Page link to reopen sidebar
                    if (!isLast) {
                        await clickAddPageInSection();
                    }

                } catch (pageError) {
                    log(`  ⚠ Error: ${pageError.message}`, 'error');
                    summary.failCount++;
                    summary.failedPages.push({
                        name: pageData.pageName,
                        type: pageData.pageType,
                        error: pageError.message
                    });
                }
            }

            log(`\n✓ Completed section "${currentSectionName}"`, 'success');
        }

        // GENERATE SUMMARY REPORT
        log(`\n${'='.repeat(70)}`, 'info');
        log('📊 SUMMARY REPORT', 'info');
        log(`${'='.repeat(70)}`, 'info');
        log(`Total Pages Processed: ${summary.totalPages}`, 'info');
        log(`✓ Successfully Created: ${summary.successCount}`, 'success');
        log(`⏭️  Skipped (Platform Pages): ${summary.skipCount}`, 'warning');
        log(`✗ Failed: ${summary.failCount}`, summary.failCount > 0 ? 'error' : 'info');

        if (summary.failedPages.length > 0) {
            log(`\nFailed Pages:`, 'error');
            summary.failedPages.forEach((page, idx) => {
                log(`  ${idx + 1}. ${page.name} (${page.type}) - ${page.error}`, 'error');
            });
        }

        log(`${'='.repeat(70)}`, 'info');
        log('🎉 Process completed!', 'success');
        log(`${'='.repeat(70)}`, 'info');

        // Show summary alert
        let alertMessage = '✅ Bulk page creation completed!\n\n';
        alertMessage += `📊 Summary:\n`;
        alertMessage += `Total Pages: ${summary.totalPages}\n`;
        alertMessage += `✓ Created: ${summary.successCount}\n`;
        alertMessage += `⏭️ Skipped: ${summary.skipCount}\n`;
        alertMessage += `✗ Failed: ${summary.failCount}`;

        if (summary.failedPages.length > 0) {
            alertMessage += `\n\nFailed Pages:\n`;
            summary.failedPages.slice(0, 5).forEach((page, idx) => {
                alertMessage += `${idx + 1}. ${page.name}\n`;
            });
            if (summary.failedPages.length > 5) {
                alertMessage += `... and ${summary.failedPages.length - 5} more`;
            }
        }

        alert(alertMessage);

    } catch (error) {
        if (error.message !== 'Process cancelled by user') {
            log(`\n❌ Error: ${error.message}`, 'error');
            alert('Error: ' + error.message);
        } else {
            // Show summary even if cancelled
            log(`\n📊 Process Cancelled - Partial Summary:`, 'warning');
            log(`Processed before cancellation: ${summary.successCount} created, ${summary.failCount} failed`, 'info');
        }
    } finally {
        // Re-enable buttons and HIDE stop button
        document.getElementById('startBulkProcessBtn').disabled = false;
        document.getElementById('previewDataBtn').disabled = false;
        document.getElementById('stopProcessBtn').disabled = true;
        document.getElementById('stopProcessBtn').style.display = 'none'; // Hide completely
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
     // Auto-check for updates on script load
    autoCheckForUpdates();


})();
