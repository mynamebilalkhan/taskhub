// Global variables for task and event deletion
let currentTaskToDelete = null;
let selectedTasks = new Set(); // Track selected tasks for bulk deletion

export function init() {
	window.currentLines.forEach(line => line.remove());
	window.currentLines = [];

	// Initialize global color variable
	if (typeof window.selectedEventColor === 'undefined') {
		window.selectedEventColor = 'teal';
	}

	const { invoke } = window.__TAURI__.core || {};
	if (!invoke) {
		console.error("Tauri API not available");
		return;
	}

	// Initialize today's date display
	updateTodayDisplay();
	// 
	// Initialize view selector
	initializeViewSelector();

	const calendarEl = document.getElementById('calendar');
	const newEventBtn = document.getElementById('new-event-btn');
	const todayBtn = document.getElementById('today-btn');
	const quickAddEventBtn = document.getElementById('quick-add-event');
	const modal = document.getElementById('event-modal');
	const closeBtn = document.getElementById('close-modal');
	const form = document.getElementById('event-form');

	const detailModal = document.getElementById('event-detail-modal');
	const detailCloseBtn = document.getElementById('detail-close-btn');
	const detailTitle = document.getElementById('detail-title');
	const detailLocation = document.getElementById('detail-location');
	const detailFrom = document.getElementById('detail-from');
	const detailTo = document.getElementById('detail-to');
	const detailUsers = document.getElementById('detail-users');

	// Delete event functionality
	const detailDeleteBtn = document.getElementById('detail-delete-btn');
	const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
	const deleteConfirmationCloseBtn = document.getElementById('delete-confirmation-close-btn');
	const deleteConfirmationCancelBtn = document.getElementById('delete-confirmation-cancel-btn');
	const deleteConfirmationDeleteBtn = document.getElementById('delete-confirmation-delete-btn');
	const deleteEventTitle = document.getElementById('delete-event-title');

	let currentEventToDelete = null;

	const taskDetailModal = document.getElementById('task-detail-modal');
	const taskDetailCloseBtn = document.getElementById('task-detail-close-btn');

	taskDetailCloseBtn?.addEventListener('click', () => {
		taskDetailModal.classList.add('hidden');
	});

	// Task delete functionality
	const taskDeleteBtn = document.getElementById('task-delete-btn');
	const deleteTaskConfirmationModal = document.getElementById('delete-task-confirmation-modal');
	const deleteTaskConfirmationCloseBtn = document.getElementById('delete-task-confirmation-close-btn');
	const deleteTaskConfirmationCancelBtn = document.getElementById('delete-task-confirmation-cancel-btn');
	const deleteTaskConfirmationDeleteBtn = document.getElementById('delete-task-confirmation-delete-btn');
	const deleteTaskTitle = document.getElementById('delete-task-title');

	taskDeleteBtn?.addEventListener('click', () => {
		if (currentTaskToDelete) {
			deleteTaskTitle.textContent = currentTaskToDelete.title;
			deleteTaskConfirmationModal.classList.remove('hidden');
		}
	});

	deleteTaskConfirmationCloseBtn?.addEventListener('click', () => {
		deleteTaskConfirmationModal.classList.add('hidden');
	});

	deleteTaskConfirmationCancelBtn?.addEventListener('click', () => {
		deleteTaskConfirmationModal.classList.add('hidden');
	});

	deleteTaskConfirmationDeleteBtn?.addEventListener('click', async () => {
		if (currentTaskToDelete) {
			try {
				await deleteTaskAndRefresh(currentTaskToDelete.id);
				deleteTaskConfirmationModal.classList.add('hidden');
				taskDetailModal.classList.add('hidden');
			} catch (err) {
				console.error("Error deleting task:", err);
				showNotification('Error deleting task', 'error');
			}
		}
	});

	const calendar = new FullCalendar.Calendar(calendarEl, {
		// ========== Exact Figma Configuration ==========
		initialView: 'timeGridWeek',

		// headerToolbar: {
		// 	left: 'prev,next today',
		// 	center: 'title',
		// 	right: 'dayGridMonth,timeGridWeek,timeGridDay'
		// },

		// ========== Layout to Match Figma ==========
		height: 'auto',
		aspectRatio: 1.8,
		firstDay: 1, // Monday first (like Figma)

		// ========== Full Day Time Slots ==========
		slotMinTime: '00:00:00', // Start at 12 AM (midnight)
		slotMaxTime: '24:00:00', // End at 12 AM next day (full 24 hours)
		slotDuration: '01:00:00', // 1 hour slots
		slotLabelInterval: '01:00:00', // Show every hour
		slotLabelFormat: {
			hour: 'numeric',
			minute: '2-digit',
			meridiem: 'short'
		},

		allDaySlot: false, // Hide all-day slot to match Figma

		// ========== Events Display ==========
		dayMaxEvents: false,
		eventDisplay: 'block',
		eventMinHeight: 50,
		displayEventTime: true,
		displayEventEnd: false,

		// ========== Event Positioning ========== 
		eventOverlap: true,
		slotEventOverlap: false,

		// ========== Date Formatting ==========
		dayHeaderFormat: {
			weekday: 'short',
			day: 'numeric'
		},

		// ========== Custom Header Renderer ==========
		dayHeaderContent: function (arg) {
			const dayName = arg.date.toLocaleDateString('en-US', { weekday: 'short' });
			const dayNumber = arg.date.getDate();

			return {
				html: `
					<div class="day-header">
						<div class="day-name">${dayName}</div>
						<div class="day-number">${dayNumber}</div>
					</div>
        `
			};
		},

		// ========== Event Styling ==========
		eventDidMount: function (info) {
			const { title, extendedProps } = info.event;

			// Add clickable checkbox for display
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.className = 'event-checkbox';
			checkbox.disabled = false; // Make it clickable
			
			// Prevent checkbox clicks from opening event modal
			checkbox.addEventListener('click', (e) => {
				e.stopPropagation(); // Prevents event modal from opening
				// Remove preventDefault to allow normal checkbox behavior
			});
			
			// Find the event title element and prepend checkbox
			const eventContent = info.el.querySelector('.fc-event-main') || info.el.querySelector('.fc-event-title-container') || info.el;
			if (eventContent) {
				eventContent.style.display = 'flex';
				eventContent.style.alignItems = 'center';
				eventContent.style.gap = '6px';
				eventContent.insertBefore(checkbox, eventContent.firstChild);
			}

			// Add tooltip
			const tooltip = `${title}\nLocation: ${extendedProps.location || 'N/A'}\nUsers: ${extendedProps.userEmails || 'N/A'}`;
			info.el.setAttribute("title", tooltip);

			// Apply color based on event properties
			let colorClass = 'figma-teal'; // Default to teal

			if (extendedProps.color) {
				colorClass = getColorClass(extendedProps.color);
			} else {
				// Fallback to content-based coloring
				const eventTitle = title.toLowerCase();
				if (eventTitle.includes('start') || eventTitle.includes('standup')) {
					colorClass = 'figma-yellow';
				} else if (eventTitle.includes('sync') || eventTitle.includes('call')) {
					colorClass = 'figma-blue';
				} else if (eventTitle.includes('dev') || eventTitle.includes('development')) {
					colorClass = 'figma-green';
				} else if (eventTitle.includes('task') || eventTitle.includes('work')) {
					colorClass = 'figma-purple';
				}
			}

			// Remove any existing color classes first
			info.el.classList.remove('figma-red', 'figma-orange', 'figma-yellow', 'figma-green', 'figma-teal', 'figma-blue', 'figma-indigo', 'figma-purple', 'figma-pink', 'figma-brown', 'figma-gray');

			// Add the color class
			info.el.classList.add(colorClass);

			// Make event appear as compact card in starting time slot only
			if (info.view.type === 'timeGridWeek' || info.view.type === 'timeGridDay') {
				// Force event to appear only in starting time slot
				info.el.style.height = '50px';
				info.el.style.maxHeight = '50px';
				info.el.style.position = 'absolute';
				info.el.style.top = '4px';
				info.el.style.zIndex = '2';
			}
		},

		eventClick: function (info) {
			info.jsEvent.preventDefault();

			// Store the current event for deletion
			currentEventToDelete = {
				id: info.event.id,
				title: info.event.title,
				start: info.event.start,
				end: info.event.end,
				extendedProps: info.event.extendedProps
			};

			detailTitle.textContent = info.event.title;
			detailLocation.textContent = info.event.extendedProps.location || 'N/A';
			detailFrom.textContent = formatDateTime(info.event.start);
			detailTo.textContent = formatDateTime(info.event.end);
			detailUsers.textContent = info.event.extendedProps.userEmails || 'N/A';

			// Add new fields
			const detailDescription = document.getElementById('detail-description');
			const detailFrequency = document.getElementById('detail-frequency');

			if (detailDescription) {
				detailDescription.textContent = info.event.extendedProps.description || 'N/A';
			}

			if (detailFrequency) {
				const frequency = info.event.extendedProps.frequency || 'none';
				const frequencyText = frequency === 'none' ? 'Do not repeat' :
					frequency.charAt(0).toUpperCase() + frequency.slice(1);
				detailFrequency.textContent = frequencyText;
			}

			// Apply background color from API data to detail-color element
			const detailColorElement = document.getElementById('detail-color');
			if (detailColorElement) {
				const eventColor = info.event.extendedProps.color || 'teal';
				const colorValue = getColorValue(eventColor);
				detailColorElement.style.backgroundColor = colorValue;
			}

			detailModal.classList.remove('hidden');
		},

		// ========== Date Selection ==========
		selectable: true,
		selectMirror: true,
		select: function (info) {
			const startDate = info.start.toISOString().slice(0, 16);
			let endDate = new Date(info.end);
			endDate.setHours(endDate.getHours() + 1);
			endDate = endDate.toISOString().slice(0, 16);

			document.getElementById('event-from').value = startDate;
			document.getElementById('event-to').value = endDate;
			modal.classList.remove('hidden');
		},

		nowIndicator: true,
		events: []
	});

	calendar.render();

	// Store calendar instance globally for view selector
	window.calendarInstance = calendar;

	// ========== Load All Data Efficiently ==========
	// Show initial loading indicator
	showCalendarLoading('Loading...');
	loadAllDataEfficiently(calendar);

	// Initialize calendar
	// setTimeout(() => {
	// 	// Calendar is ready
	// }, 1000);

	// ========== Event Handlers ==========
	newEventBtn.addEventListener('click', () => {
		modal.classList.remove('hidden');
		initializeEventModal();

		// Set default timed values when modal opens
		const now = new Date();
		const startTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
		const endTime = new Date(now.getTime() + 90 * 60000); // 90 minutes from now

		document.getElementById('event-from').value = startTime.toISOString().slice(0, 16);
		document.getElementById('event-to').value = endTime.toISOString().slice(0, 16);
	});

	todayBtn?.addEventListener('click', () => calendar.today());
	quickAddEventBtn?.addEventListener('click', () => {
		modal.classList.remove('hidden');
		initializeEventModal();

		// Set default timed values when modal opens
		const now = new Date();
		const startTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
		const endTime = new Date(now.getTime() + 90 * 60000); // 90 minutes from now

		document.getElementById('event-from').value = startTime.toISOString().slice(0, 16);
		document.getElementById('event-to').value = endTime.toISOString().slice(0, 16);
	});

	// ========== Task Modal Event Listeners ==========
	const quickAddTaskBtn = document.getElementById('quick-add-task');
	const taskModal = document.getElementById('add-task-modal');
	const saveTaskBtn = document.getElementById('save-task-btn');
	const cancelTaskBtn = document.getElementById('cancel-task-btn');

	quickAddTaskBtn?.addEventListener('click', async () => {
		taskModal.classList.remove('hidden');
		await initializeTaskModal();
	});

	// Use exact same implementation as page.js
	cancelTaskBtn?.addEventListener('click', () => {
		taskModal.classList.add('hidden');
	});

	saveTaskBtn?.addEventListener('click', async () => {
		const { invoke } = window.__TAURI__.core || {};
		
		const vaultId = document.querySelector("#task-vault-id").value;
		
		// Validate vault selection
		if (!vaultId) {
			showNotification('Please select a vault', 'error');
			return;
		}

		const payload = {
			title: document.querySelector("#task-title").value,
			description: document.querySelector("#task-description").value,
			dueDate: document.querySelector("#task-due-date").value,
			status: document.querySelector("#task-status").value,
			priority: document.querySelector("#task-priority").value,
			assignedTo: parseInt(document.querySelector("#task-assigned-id").value),
			pageId: parseInt(vaultId), // Use selected vault ID as pageId
			industry: document.querySelector("#task-industry").value
		};

		try {
			const created = await invoke("create_task_for_page", payload);
			taskModal.classList.add("hidden");
			showNotification("Task created successfully", 'success');
			
			// Refresh calendar data to update task lists
			refreshCalendarData();
		} catch (e) {
			console.error("Error adding task:", e);
			showNotification(`Failed to create task: ${e}`, 'error');
		}
	});

	// Close task modal when clicking outside
	taskModal?.addEventListener('click', (e) => {
		if (e.target === taskModal) {
			taskModal.classList.add('hidden');
		}
	});

	// Close btn
	closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
	detailCloseBtn.addEventListener('click', () => detailModal.classList.add('hidden'));

	// Delete event event listeners
	detailDeleteBtn?.addEventListener('click', () => {
		if (currentEventToDelete) {
			deleteEventTitle.textContent = currentEventToDelete.title;
			deleteConfirmationModal.classList.remove('hidden');
		}
	});



	deleteConfirmationCloseBtn?.addEventListener('click', () => {
		deleteConfirmationModal.classList.add('hidden');
	});

	deleteConfirmationCancelBtn?.addEventListener('click', () => {
		deleteConfirmationModal.classList.add('hidden');
	});

	deleteConfirmationDeleteBtn?.addEventListener('click', async () => {
		if (currentEventToDelete) {
			// Ensure the ID is a number
			const eventId = parseInt(currentEventToDelete.id);
			if (isNaN(eventId)) {
				showNotification('Invalid event ID', 'error');
				return;
			}

			await deleteEventAndRefresh(eventId);
			deleteConfirmationModal.classList.add('hidden');
			detailModal.classList.add('hidden');
		}
	});

	// Color picker functionality
	const colorFieldInput = document.getElementById('color-field-input');
	const colorPickerModal = document.getElementById('color-picker-modal');
	const colorPickerClose = document.getElementById('color-picker-close');
	const colorOptions = document.querySelectorAll('.color-option');
	const selectedColorPreview = document.getElementById('selected-color-preview');
	const selectedColorLabel = document.getElementById('selected-color-label');

	colorFieldInput?.addEventListener('click', (e) => {
		e.stopPropagation();
		verifyColorFieldState();
		colorPickerModal.classList.remove('hidden');
	});

	colorPickerClose?.addEventListener('click', () => {
		colorPickerModal.classList.add('hidden');
	});

	colorPickerModal?.addEventListener('click', (e) => {
		if (e.target === colorPickerModal) {
			colorPickerModal.classList.add('hidden');
		}
	});

	colorOptions.forEach(option => {
		option.addEventListener('click', () => {
			const color = option.dataset.color;
			const colorValue = getColorValue(color);

			// Update selected color
			selectedColorPreview.style.backgroundColor = colorValue;
			selectedColorLabel.textContent = color.charAt(0).toUpperCase() + color.slice(1);
			window.selectedEventColor = color;

			// Update checkmarks
			colorOptions.forEach(opt => {
				opt.classList.remove('selected');
				opt.querySelector('.color-checkmark').classList.add('hidden');
			});
			option.classList.add('selected');
			option.querySelector('.color-checkmark').classList.remove('hidden');

			// Close color picker
			colorPickerModal.classList.add('hidden');

			// Verify the state after selection
			setTimeout(() => {
				verifyColorFieldState();
			}, 100);
		});
	});

	// Modal cancel button
	const modalCancelBtn = document.getElementById('modal-cancel-btn');
	modalCancelBtn?.addEventListener('click', () => modal.classList.add('hidden'));

	// ========== Month Navigation Functionality ==========
	initializeMonthNavigation();

	// ========== Sidebar Expandable Sections ==========
	initializeSidebarSections();

	// ========== Original Sidebar Event Listeners ==========
	document.querySelectorAll('.section-header').forEach(btn => {
		const target = document.getElementById(btn.dataset.target);
		btn.addEventListener('click', () => {
			target.classList.toggle('open');
			btn.querySelector('.chevron-icon').classList.toggle('rotated');
		});
	});

	// ========== Refresh Button ==========
	const refreshBtn = document.getElementById('refresh-btn');
	if (refreshBtn) {
		refreshBtn.addEventListener('click', () => {
			refreshCalendarData();
			showNotification('Calendar refreshed', 'info');
		});
	}

	// ========== All Day Toggle ==========
	const allDayToggle = document.getElementById('all-day-toggle');
	const datetimeContainer = document.getElementById('datetime-container');
	const alldayContainer = document.getElementById('allday-container');

	allDayToggle?.addEventListener('change', () => {
		const isAllDay = allDayToggle.checked;

		if (isAllDay) {
			// Switch to all-day mode
			datetimeContainer.classList.add('hidden');
			alldayContainer.classList.remove('hidden');

			// Set default all-day dates (today) if not already set
			const fromDateInput = document.getElementById('event-from-date');
			const toDateInput = document.getElementById('event-to-date');

			if (!fromDateInput.value) {
				const today = new Date().toISOString().split('T')[0];
				fromDateInput.value = today;
			}
			if (!toDateInput.value) {
				const today = new Date().toISOString().split('T')[0];
				toDateInput.value = today;
			}
		} else {
			// Switch to timed mode
			datetimeContainer.classList.remove('hidden');
			alldayContainer.classList.add('hidden');

			// Set default timed values if not already set
			const fromInput = document.getElementById('event-from');
			const toInput = document.getElementById('event-to');

			if (!fromInput.value) {
				const now = new Date();
				const startTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
				fromInput.value = startTime.toISOString().slice(0, 16);
			}
			if (!toInput.value) {
				const now = new Date();
				const endTime = new Date(now.getTime() + 90 * 60000); // 90 minutes from now
				toInput.value = endTime.toISOString().slice(0, 16);
			}
		}
	});

	// ========== Description Character Counter ==========
	const descriptionTextarea = document.getElementById('event-description');
	const charCountSpan = document.getElementById('description-char-count');

	descriptionTextarea?.addEventListener('input', () => {
		const currentLength = descriptionTextarea.value.length;
		charCountSpan.textContent = currentLength;

		// Change color when approaching limit
		if (currentLength > 450) {
			charCountSpan.style.color = '#dc2626'; // Red
		} else if (currentLength > 400) {
			charCountSpan.style.color = '#f59e0b'; // Orange
		} else {
			charCountSpan.style.color = '#6b7280'; // Default gray
		}
	});

	// Datetime input listeners for display updates
	const fromInput = document.getElementById('event-from');
	const toInput = document.getElementById('event-to');

	// Set default values (current time + 30 minutes)
	const now = new Date();
	const startTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
	const endTime = new Date(startTime.getTime() + 60 * 60000); // 1 hour duration

	if (fromInput) {
		fromInput.value = startTime.toISOString().slice(0, 16);
	}
	if (toInput) {
		toInput.value = endTime.toISOString().slice(0, 16);
	}

	// Update datetime display
	updateDateTimeDisplay();

	// Validate that end time is after start time
	fromInput?.addEventListener('change', () => {
		validateDateTime();
		updateDateTimeDisplay();
	});
	toInput?.addEventListener('change', () => {
		validateDateTime();
		updateDateTimeDisplay();
	});

	document.querySelectorAll('.section-header').forEach(btn => {
		const target = document.getElementById(btn.dataset.target);
		btn.addEventListener('click', () => {
			target.classList.toggle('open');
			btn.querySelector('.chevron-icon').classList.toggle('rotated');
		});
	});

	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		verifyColorFieldState();

		const title = document.getElementById('event-title').value;
		const location = document.getElementById('event-location').value;
		const userEmails = document.getElementById('event-user-emails').value;
		const description = document.getElementById('event-description').value;
		const frequency = document.getElementById('event-frequency').value;
		const isAllDay = document.getElementById('all-day-toggle').checked;

		// Validate required fields
		if (!title.trim()) {
			alert('Please enter an event title');
			return;
		}

		// Validate description (optional but if provided, ensure it's not just whitespace)
		if (description.trim() && description.trim().length < 3) {
			alert('Description must be at least 3 characters long if provided');
			return;
		}

		let from, to;

		if (isAllDay) {
			// Handle all-day events
			const fromDate = document.getElementById('event-from-date').value;
			const toDate = document.getElementById('event-to-date').value;

			if (!fromDate || !toDate) {
				alert('Please select start and end dates for all-day event');
				return;
			}

			// Convert to ISO strings for all-day events
			from = fromDate + 'T00:00:00';
			to = toDate + 'T23:59:59';
		} else {
			// Handle timed events
			from = document.getElementById('event-from').value;
			to = document.getElementById('event-to').value;

			if (!from || !to) {
				alert('Please select start and end times');
				return;
			}

			// Validate that end time is after start time
			const fromDate = new Date(from);
			const toDate = new Date(to);

			if (toDate <= fromDate) {
				alert('End time must be after start time');
				return;
			}
		}

		// Get selected color
		const selectedColor = window.selectedEventColor || 'teal';

		try {
			const userId = invoke ? await invoke("get_current_user_id") : null;

			const eventData = {
				title: title.trim(),
				location: location.trim(),
				from,
				to,
				userEmails: userEmails.trim(),
				description: description.trim(),
				frequency,
				color: selectedColor,
				allDay: isAllDay,
				createdBy: userId
			};

			const result = invoke
				? await invoke('create_event', {
					title: eventData.title,
					location: eventData.location,
					from: eventData.from,
					to: eventData.to,
					userEmails: eventData.userEmails,
					description: eventData.description,
					allDay: eventData.allDay,
					frequency: eventData.frequency,
					color: eventData.color,
					createdBy: eventData.createdBy
				})
				: true;

			if (result === true) {
				modal.classList.add('hidden');
				form.reset();

				// Reset all-day toggle and containers
				document.getElementById('all-day-toggle').checked = false;
				datetimeContainer.classList.remove('hidden');
				alldayContainer.classList.add('hidden');

				// Reset character counter
				const charCountSpan = document.getElementById('description-char-count');
				if (charCountSpan) {
					charCountSpan.textContent = '0';
					charCountSpan.style.color = '#6b7280';
				}

				// Add event to calendar with the selected color
				const newEvent = calendar.addEvent({
					title: title.trim(),
					start: from,
					end: to,
					allDay: isAllDay,
					extendedProps: {
						location: location.trim(),
						userEmails: userEmails.trim(),
						description: description.trim(),
						frequency,
						color: selectedColor,
						allDay: isAllDay
					}
				});

				// Apply color to the event immediately
				if (newEvent && newEvent.el) {
					const colorClass = getColorClass(selectedColor);
					newEvent.el.classList.add(colorClass);
				}

				// Reset color picker to default
				window.selectedEventColor = 'teal';
				const selectedColorPreview = document.getElementById('selected-color-preview');
				const selectedColorLabel = document.getElementById('selected-color-label');

				if (selectedColorPreview) {
					selectedColorPreview.style.backgroundColor = getColorValue('teal');
				}

				if (selectedColorLabel) {
					selectedColorLabel.textContent = 'Teal';
				}

				// Refresh calendar data to update upcoming events list and counts
				refreshCalendarData();

				// Event created successfully
			} else {
				console.error("Failed to create event.");
				alert('Failed to create event. Please try again.');
			}
		} catch (err) {
			console.error("Invoke error:", err);
			alert('Error creating event. Please try again.');
		}
	});

	// Delete Selected Button functionality
	const deleteSelectedBtn = document.querySelector('.footer-btn[title="Delete"]');
	if (deleteSelectedBtn) {
		deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
		// Initialize button state (disabled by default)
		updateDeleteSelectedButtonState();
	}
}

// ========== Optimized Data Loading ==========

// Cache for storing data to avoid duplicate API calls
let dataCache = {
	events: null,
	upcomingEvents: null,
	tasks: null,
	userId: null,
	lastFetch: null
};

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Load all data efficiently with parallel API calls and caching
 */
async function loadAllDataEfficiently(calendar) {
	const { invoke } = window.__TAURI__.core || {};
	if (!invoke) return;

	try {
		// Check if we have valid cached data
		if (dataCache.lastFetch && (Date.now() - dataCache.lastFetch) < CACHE_DURATION) {
			// Use cached data (no loading indicator needed for cached response)
			populateCalendarEvents(calendar, dataCache.events);
			populateAllSidebarData(dataCache.tasks, dataCache.upcomingEvents || dataCache.events);
			updateTaskCountsFromCache(dataCache.tasks, dataCache.upcomingEvents || dataCache.events);
			return;
		}

		// Show loading indicator for fresh data fetch
		showCalendarLoading('Loading...');

		// Get user ID first (needed for all other calls)
		const userId = await invoke("get_current_user_id");
		dataCache.userId = userId;

		// Load all data in parallel for maximum performance
		const [events, upcomingEvents, pinned, favorites, dueToday, assigned] = await Promise.all([
			invoke("get_all_events_for_current_user"),
			invoke("get_upcoming_events_for_current_user"),
			invoke("get_pinned_tasks_for_user", { userId }),
			invoke("get_favorite_tasks_for_user", { userId }),
			invoke("get_due_today_tasks_for_user", { userId }),
			invoke("get_assigned_tasks_for_user", { userId })
		]);

		// Cache the data
		dataCache.events = events;
		dataCache.upcomingEvents = upcomingEvents;
		dataCache.tasks = { pinned, favorites, dueToday, assigned };
		dataCache.lastFetch = Date.now();

		// Populate calendar and sidebar efficiently
		populateCalendarEvents(calendar, events);
		populateAllSidebarData(dataCache.tasks, upcomingEvents);
		updateTaskCountsFromCache(dataCache.tasks, upcomingEvents);

		// Hide loading indicator
		hideCalendarLoading();

	} catch (err) {
		console.error("Error loading data efficiently:", err);
		
		// Hide loading indicator on error
		hideCalendarLoading();
		
		// Fallback to individual loading if parallel loading fails
		loadSidebarTasks();
		loadEventsFromAPI(calendar);
	}
}

/**
 * Populate calendar events efficiently
 */
function populateCalendarEvents(calendar, events) {
	if (!Array.isArray(events)) {
		console.warn("Invalid events format:", events);
		return;
	}

	// Clear existing events first
	calendar.removeAllEvents();

	// Batch add events for better performance
	const eventObjects = events.map(ev => ({
		id: ev.id,
		title: ev.title,
		start: ev.dateTimeFrom,
		end: ev.dateTimeTo,
		allDay: ev.allDay || false,
		extendedProps: {
			location: ev.location,
			description: ev.description,
			frequency: ev.frequency || 'none',
			createdBy: ev.createdBy,
			createdByUser: ev.createdByUser,
			userEmails: ev.userEmails,
			userEvents: ev.userEvents,
			color: ev.color || 'teal',
			allDay: ev.allDay || false
		}
	}));

	// Add all events at once
	calendar.addEventSource(eventObjects);
}

/**
 * Populate all sidebar data efficiently
 */
function populateAllSidebarData(tasks, events) {
	// Use DocumentFragment for better performance
	const fragment = document.createDocumentFragment();

	// Populate lists - no checkboxes for favorite, pinned, and assigned tasks
	populateListWithoutCheckboxes("pinned-tasks-list", tasks.pinned);
	populateListWithoutCheckboxes("favorites-list", tasks.favorites);
	populateListOptimized("due-today-list", tasks.dueToday); // Keep checkboxes for "Your Day" tasks
	populateListWithoutCheckboxes("assigned-tasks-list", tasks.assigned);
	populateUpcomingEventsOptimized("upcoming-events-list", events);
}

/**
 * Update task counts from cached data
 */
function updateTaskCountsFromCache(tasks, events) {
	updateCountDisplay('pinned-count', tasks.pinned.length);
	updateCountDisplay('favorites-count', tasks.favorites.length);
	updateCountDisplay('today-count', tasks.dueToday.length);
	updateCountDisplay('assigned-count', tasks.assigned.length);
	
	// Update upcoming events count
	const eventCount = events && events.length ? events.length : 0;
	updateCountDisplay('upcoming-count', eventCount);
}

/**
 * Optimized list population using DocumentFragment
 */
function populateListOptimized(listId, tasks) {
	const ul = document.getElementById(listId);
	if (!ul) return;

	// Use DocumentFragment for better performance
	const fragment = document.createDocumentFragment();

	if (!tasks || tasks.length === 0) {
		const li = document.createElement("li");
		li.textContent = "No tasks found";
		li.classList.add("no-tasks-message");
		fragment.appendChild(li);
	} else {
		tasks.forEach(task => {
			const li = document.createElement("li");
			li.classList.add("task-item");
			
			// Create checkbox
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.className = "task-checkbox";
			checkbox.id = `task-${task.id}`;
			checkbox.value = task.id;
			checkbox.addEventListener('change', (e) => handleTaskSelection(e, task));
			
			// Create label for checkbox and task title
			const label = document.createElement("label");
			label.setAttribute('for', `task-${task.id}`);
			label.className = "task-label";
			
			// Create task title span
			const taskTitle = document.createElement("span");
			taskTitle.textContent = task.title;
			taskTitle.className = "task-title";
			taskTitle.style.cursor = "pointer";
			
			// Add click handler for showing task details
			taskTitle.addEventListener('click', (e) => {
				e.preventDefault();
				showTaskDetails(task);
			});
			
			// Assemble the structure
			label.appendChild(taskTitle);
			li.appendChild(checkbox);
			li.appendChild(label);
			
			fragment.appendChild(li);
		});
	}

	// Single DOM update
	ul.innerHTML = "";
	ul.appendChild(fragment);
}

/**
 * Task list population without checkboxes (for favorite, pinned, and assigned tasks)
 */
function populateListWithoutCheckboxes(listId, tasks) {
	const ul = document.getElementById(listId);
	if (!ul) return;

	// Use DocumentFragment for better performance
	const fragment = document.createDocumentFragment();

	if (!tasks || tasks.length === 0) {
		const li = document.createElement("li");
		li.textContent = "No tasks found";
		li.classList.add("no-tasks-message");
		fragment.appendChild(li);
	} else {
		tasks.forEach(task => {
			const li = document.createElement("li");
			li.classList.add("task-item", "no-checkbox");
			
			// Create task title span without checkbox
			const taskTitle = document.createElement("span");
			taskTitle.textContent = task.title;
			taskTitle.className = "task-title";
			taskTitle.style.cursor = "pointer";
			taskTitle.style.paddingLeft = "8px"; // Add some padding since no checkbox
			
			// Add click handler for showing task details
			taskTitle.addEventListener('click', (e) => {
				e.preventDefault();
				showTaskDetails(task);
			});
			
			li.appendChild(taskTitle);
			fragment.appendChild(li);
		});
	}

	// Single DOM update
	ul.innerHTML = "";
	ul.appendChild(fragment);
}

// ========== Calendar Loading Utilities ==========

/**
 * Show calendar loading overlay
 */
function showCalendarLoading(message = 'Loading...') {
	const loadingOverlay = document.getElementById('calendar-loading-overlay');
	const loadingText = document.querySelector('.loading-text');
	
	if (loadingOverlay) {
		if (loadingText) {
			loadingText.textContent = message;
		}
		loadingOverlay.classList.remove('hidden');
		console.log('📅 Loading started:', message);
	}
}

/**
 * Hide calendar loading overlay
 */
function hideCalendarLoading() {
	const loadingOverlay = document.getElementById('calendar-loading-overlay');
	
	if (loadingOverlay) {
		loadingOverlay.classList.add('hidden');
		console.log('✅ Loading completed');
	}
}

/**
 * Show loading for specific operation with custom message
 */
function showLoadingWithMessage(message) {
	showCalendarLoading(message);
}

/**
 * Test function to demonstrate loading states
 */
window.testCalendarLoading = function() {
	console.log("=== Testing Loading States ===");
	
	// Test different loading messages
	showCalendarLoading('Loading...');
	
	setTimeout(() => {
		showCalendarLoading('Loading...');
		setTimeout(() => {
			showCalendarLoading('Loading...');
			setTimeout(() => {
				hideCalendarLoading();
				console.log("✅ Loading test completed");
			}, 1000);
		}, 1000);
	}, 1000);
};

/**
 * Test function to simulate data refresh with loading
 */
window.testCalendarRefresh = function() {
	console.log("=== Testing Data Refresh with Loading ===");
	refreshCalendarData();
};

// ========== Test Functions for Calendar Task Management ==========

/**
 * Test function to verify task list display (checkboxes vs no checkboxes)
 */
window.testCalendarTaskDisplay = function() {
	console.log("=== Testing Calendar Task Display ===");
	
	const pinnedList = document.getElementById("pinned-tasks-list");
	const favoritesList = document.getElementById("favorites-list");
	const dueTodayList = document.getElementById("due-today-list");
	const assignedList = document.getElementById("assigned-tasks-list");
	
	console.log("Pinned tasks checkboxes:", pinnedList?.querySelectorAll('.task-checkbox').length || 0);
	console.log("Favorite tasks checkboxes:", favoritesList?.querySelectorAll('.task-checkbox').length || 0);
	console.log("Due today tasks checkboxes:", dueTodayList?.querySelectorAll('.task-checkbox').length || 0);
	console.log("Assigned tasks checkboxes:", assignedList?.querySelectorAll('.task-checkbox').length || 0);
	
	console.log("✅ Expected: Pinned=0, Favorites=0, Due Today>0, Assigned=0");
};

/**
 * Test function to simulate task deletion validation
 */
window.testTaskDeletionValidation = async function(taskId) {
	console.log(`=== Testing Task Deletion Validation for Task ID: ${taskId} ===`);
	
	try {
		const { invoke } = window.__TAURI__.core || {};
		if (invoke) {
			const [isFavorited, isPinned] = await Promise.all([
				invoke("is_task_favorited", { taskId }),
				invoke("is_task_pinned", { taskId })
			]);
			
			console.log(`Task ${taskId} - Favorited: ${isFavorited}, Pinned: ${isPinned}`);
			
			if (isFavorited || isPinned) {
				let statusText = "";
				if (isFavorited && isPinned) {
					statusText = "favorited and pinned";
				} else if (isFavorited) {
					statusText = "favorited";
				} else {
					statusText = "pinned";
				}
				console.log(`❌ Deletion would be blocked: Task is ${statusText}`);
				return false;
			} else {
				console.log("✅ Deletion would be allowed: Task is neither favorited nor pinned");
				return true;
			}
		}
	} catch (err) {
		console.error("Error testing deletion validation:", err);
		return false;
	}
};

/**
 * Test function to simulate bulk task deletion validation
 */
window.testBulkTaskDeletionValidation = async function(taskIds) {
	console.log(`=== Testing Bulk Task Deletion Validation for ${taskIds.length} Tasks ===`);
	
	try {
		const { invoke } = window.__TAURI__.core || {};
		if (invoke) {
			const statusChecks = taskIds.map(async (taskId) => {
				const [isFavorited, isPinned] = await Promise.all([
					invoke("is_task_favorited", { taskId }),
					invoke("is_task_pinned", { taskId })
				]);
				return { taskId, isFavorited, isPinned };
			});

			const taskStatuses = await Promise.all(statusChecks);
			const protectedTasks = taskStatuses.filter(task => task.isFavorited || task.isPinned);

			console.log("Task Status Summary:");
			taskStatuses.forEach(task => {
				const status = task.isFavorited && task.isPinned ? "favorited & pinned" : 
				              task.isFavorited ? "favorited" : 
				              task.isPinned ? "pinned" : "normal";
				console.log(`  Task ${task.taskId}: ${status}`);
			});

			if (protectedTasks.length > 0) {
				console.log(`❌ Bulk deletion would be blocked: ${protectedTasks.length} protected tasks found`);
				return false;
			} else {
				console.log("✅ Bulk deletion would be allowed: All tasks are unprotected");
				return true;
			}
		}
	} catch (err) {
		console.error("Error testing bulk deletion validation:", err);
		return false;
	}
};

/**
 * Optimized upcoming events population
 */
function populateUpcomingEventsOptimized(listId, events) {
	const ul = document.getElementById(listId);
	if (!ul) return;

	const fragment = document.createDocumentFragment();
	const eventCount = events && events.length ? events.length : 0;

	if (!events || events.length === 0) {
		const li = document.createElement("li");
		li.textContent = "No events found";
		fragment.appendChild(li);
	} else {
		// Sort events by start date
		const sortedEvents = events
			.sort((a, b) => new Date(a.dateTimeFrom) - new Date(b.dateTimeFrom))
			.slice(0, 10); // Limit to 10 events for performance

		sortedEvents.forEach(event => {
			const li = document.createElement("li");
			const eventDate = new Date(event.dateTimeFrom);
			const formattedDate = eventDate.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});

			li.textContent = `${event.title} - ${formattedDate}`;
			li.style.cursor = "pointer";
			li.addEventListener('click', () => showEventDetails(event));
			fragment.appendChild(li);
		});
	}

	ul.innerHTML = "";
	ul.appendChild(fragment);
	
	// Update upcoming events count
	updateCountDisplay('upcoming-count', eventCount);
}

/**
 * Show task details (extracted for reuse)
 */
function showTaskDetails(task) {
	const taskDetailModal = document.getElementById('task-detail-modal');
	const taskDetailTitle = document.getElementById('task-detail-title');
	const taskDetailDesc = document.getElementById('task-detail-desc');
	const taskDetailStatus = document.getElementById('task-detail-status');
	const taskDetailPriority = document.getElementById('task-detail-priority');
	const taskDetailDue = document.getElementById('task-detail-due');
	const taskDetailAssigned = document.getElementById('task-detail-assigned');
	const taskDetailIndustry = document.getElementById('task-detail-industry');
	const taskDetailCreatedBy = document.getElementById('task-detail-createdby');
	const taskDetailCreatedOn = document.getElementById('task-detail-createdon');
	const taskDetailModified = document.getElementById('task-detail-modified');

	// Store the current task for deletion
	currentTaskToDelete = task;

	taskDetailTitle.textContent = task.title || "—";
	taskDetailDesc.textContent = task.description || "—";
	taskDetailIndustry.textContent = task.industry || "—";
	taskDetailStatus.textContent = task.status || "—";
	taskDetailPriority.textContent = task.priority || "—";
	taskDetailDue.textContent = task.dueDate ? formatDateTime(new Date(task.dueDate)) : "—";
	taskDetailAssigned.textContent = task.assignedToName || "—";
	taskDetailCreatedBy.textContent = task.createdByName || "—";
	taskDetailCreatedOn.textContent = task.createdDateTime ? formatDateTime(new Date(task.createdDateTime)) : "—";
	taskDetailModified.textContent = task.lastModifyDateTime ? formatDateTime(new Date(task.lastModifyDateTime)) : "—";
	taskDetailModal.classList.remove("hidden");
}

// ========== Delete Task Functions ==========

/**
 * Delete a task by its ID
 * @param {number} taskId - The ID of the task to delete
 * @returns {Promise<boolean>} - Returns true if deletion was successful
 */
async function deleteTask(taskId) {
	const { invoke } = window.__TAURI__.core || {};
	if (!invoke) {
		console.error("Tauri API not available");
		throw new Error("Tauri API not available");
	}

	try {
		const result = await invoke('delete_task', { taskId: taskId });
		return result;
	} catch (error) {
		console.error('Failed to delete task:', error);
		throw error;
	}
}

/**
 * Delete task and refresh the sidebar data
 * @param {number} taskId - The ID of the task to delete
 */
async function deleteTaskAndRefresh(taskId) {
	try {
		// Check if task is favorite or pinned before attempting deletion
		const { invoke } = window.__TAURI__.core || {};
		if (invoke) {
			const [isFavorited, isPinned] = await Promise.all([
				invoke("is_task_favorited", { taskId }),
				invoke("is_task_pinned", { taskId })
			]);

			if (isFavorited || isPinned) {
				let statusText = "";
				if (isFavorited && isPinned) {
					statusText = "favorited and pinned";
				} else if (isFavorited) {
					statusText = "favorited";
				} else {
					statusText = "pinned";
				}
				
				showNotification(`Cannot delete this task because it is ${statusText}. Please unmark it first and then try deleting.`, 'error');
				return;
			}
		}

		// Call the delete API
		const result = await deleteTask(taskId);

		if (result) {
			showNotification('Task deleted successfully', 'success');
			// Refresh sidebar data to update task counts and lists
			showLoadingWithMessage('Updating task lists...');
			refreshCalendarData();
		} else {
			showNotification('Failed to delete task', 'error');
		}
	} catch (err) {
		console.error("Error in deleteTaskAndRefresh:", err);
		showNotification('Error deleting task', 'error');
	}
}

/**
 * Show event details (extracted for reuse)
 */
function showEventDetails(event) {
	const detailModal = document.getElementById('event-detail-modal');
	const detailTitle = document.getElementById('detail-title');
	const detailTitleField = document.getElementById('detail-title-field');
	const detailLocation = document.getElementById('detail-location');
	const detailFrom = document.getElementById('detail-from');
	const detailTo = document.getElementById('detail-to');
	const detailUsers = document.getElementById('detail-users');

	detailTitle.textContent = event.title;
	if (detailTitleField) {
		detailTitleField.textContent = event.title;
	}
	detailLocation.textContent = event.location || 'N/A';
	detailFrom.textContent = formatDateTime(new Date(event.dateTimeFrom));
	detailTo.textContent = formatDateTime(new Date(event.dateTimeTo));
	detailUsers.textContent = event.userEmails || 'N/A';

	// Add description and frequency fields
	const detailDescription = document.getElementById('detail-description');
	const detailFrequency = document.getElementById('detail-frequency');

	if (detailDescription) {
		detailDescription.textContent = event.description || 'N/A';
	}

	if (detailFrequency) {
		const frequency = event.frequency || 'none';
		const frequencyText = frequency === 'none' ? 'Do not repeat' :
			frequency.charAt(0).toUpperCase() + frequency.slice(1);
		detailFrequency.textContent = frequencyText;
	}

	// Apply background color from API data to detail-color element
	const detailColorElement = document.getElementById('detail-color');
	if (detailColorElement) {
		const eventColor = event.color || 'teal';
		const colorValue = getColorValue(eventColor);
		detailColorElement.style.backgroundColor = colorValue;
	}

	detailModal.classList.remove('hidden');
}

// ========== Legacy Functions (for fallback) ==========
async function loadSidebarTasks() {
	const { invoke } = window.__TAURI__.core || {};
	if (!invoke) return;

	try {
		const userId = await invoke("get_current_user_id");
		let pinned = await invoke("get_pinned_tasks_for_user", { userId });
		populateList("pinned-tasks-list", pinned);

		let favorites = await invoke("get_favorite_tasks_for_user", { userId });
		populateList("favorites-list", favorites);

		let dueToday = await invoke("get_due_today_tasks_for_user", { userId });
		populateList("due-today-list", dueToday);

		let assigned = await invoke("get_assigned_tasks_for_user", { userId });
		populateList("assigned-tasks-list", assigned);

		// Load upcoming events for sidebar
		let upcomingEvents = await invoke("get_upcoming_events_for_current_user");
		populateUpcomingEvents("upcoming-events-list", upcomingEvents);

		// Update task counts after loading
		updateTaskCounts();

	} catch (err) {
		console.error("Error loading tasks for sidebar:", err);
	}
}

function populateList(listId, tasks) {
	const ul = document.getElementById(listId);
	if (!ul) return;

	ul.innerHTML = "";

	if (!tasks || tasks.length === 0) {
		const li = document.createElement("li");
		li.textContent = "No tasks found";
		li.classList.add("no-tasks-message");
		ul.appendChild(li);
		return;
	}

	tasks.forEach(task => {
		const li = document.createElement("li");
		li.classList.add("task-item");
		
		// Create checkbox
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.className = "task-checkbox";
		checkbox.id = `task-${task.id}`;
		checkbox.value = task.id;
		checkbox.addEventListener('change', (e) => handleTaskSelection(e, task));
		
		// Create label for checkbox and task title
		const label = document.createElement("label");
		label.setAttribute('for', `task-${task.id}`);
		label.className = "task-label";
		
		// Create task title span
		const taskTitle = document.createElement("span");
		taskTitle.textContent = task.title;
		taskTitle.className = "task-title";
		taskTitle.style.cursor = "pointer";
		
		// Add click handler for showing task details
		taskTitle.addEventListener('click', (e) => {
			e.preventDefault();
			showTaskDetails(task);
		});
		
		// Assemble the structure
		label.appendChild(taskTitle);
		li.appendChild(checkbox);
		li.appendChild(label);

		ul.appendChild(li);
	});
}

function populateUpcomingEvents(listId, events) {
	const ul = document.getElementById(listId);
	if (!ul) return;

	ul.innerHTML = "";

	if (!events || events.length === 0) {
		ul.innerHTML = "<li>No events found</li>";
		return;
	}

	// Sort events by start date
	events.sort((a, b) => new Date(a.dateTimeFrom) - new Date(b.dateTimeFrom));

	events.forEach(event => {
		const li = document.createElement("li");
		const eventDate = new Date(event.dateTimeFrom);
		const formattedDate = eventDate.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});

		li.textContent = `${event.title} - ${formattedDate}`;
		li.style.cursor = "pointer";

		li.addEventListener('click', () => {
			// Show event details using the centralized function
			showEventDetails(event);
		});

		ul.appendChild(li);
	});
}

function formatDateTime(dateObj) {
	if (!dateObj) return '';
	return dateObj.toLocaleString([], {
		year: 'numeric',
		month: '2-digit',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

async function loadEventsFromAPI(calendar) {
	const { invoke } = window.__TAURI__.core || {};
	if (!invoke) return;

	try {
		const events = await invoke("get_all_events_for_current_user");
		if (!Array.isArray(events)) {
			console.warn("Invalid events format:", events);
			return;
		}

		// Use the optimized function
		populateCalendarEvents(calendar, events);
	} catch (err) {
		console.error("Error loading events:", err);
	}
}

/**
 * Refresh data (clear cache and reload)
 */
function refreshCalendarData() {
	// Show loading indicator for data refresh
	showCalendarLoading('Loading...');
	
	// Clear cache
	dataCache = {
		events: null,
		upcomingEvents: null,
		tasks: null,
		userId: null,
		lastFetch: null
	};

	// Reload data
	if (window.calendarInstance) {
		loadAllDataEfficiently(window.calendarInstance);
	}
}

// Helper functions for new layout features
function updateTodayDisplay() {
	const today = new Date();
	const todayDay = document.querySelector('.today-day');
	const todayMonth = document.querySelector('.today-month');

	if (todayDay) {
		todayDay.textContent = today.getDate();
	}

	if (todayMonth) {
		todayMonth.textContent = today.toLocaleDateString('en-US', { month: 'short' });
	}
}

function initializeViewSelector() {
	const viewBtns = document.querySelectorAll('.view-btn');
	const todayBtn = document.getElementById('today-btn');

	viewBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			// Remove active class from all buttons
			viewBtns.forEach(b => b.classList.remove('active'));
			// Add active class to clicked button
			btn.classList.add('active');

			// Trigger calendar view change
			const view = btn.dataset.view;
			if (window.calendarInstance) {
				window.calendarInstance.changeView(view);
			}
		});
	});

	if (todayBtn) {
		todayBtn.addEventListener('click', () => {
			if (window.calendarInstance) {
				window.calendarInstance.today();
			}
		});
	}
}

async function updateTaskCounts() {
	// Use cached data if available
	if (dataCache.tasks) {
		updateTaskCountsFromCache(dataCache.tasks, dataCache.upcomingEvents || dataCache.events);
		// Update today's stats
		updateCountDisplay('today-events', window.calendarInstance ? window.calendarInstance.getEvents().length : 0);
		updateCountDisplay('today-tasks', dataCache.tasks.dueToday.length);
		return;
	}

	// Fallback to API calls if no cache
	const { invoke } = window.__TAURI__.core || {};
	if (!invoke) return;

	try {
		const userId = await invoke("get_current_user_id");

		// Get counts for each section in parallel
		const [pinned, favorites, dueToday, assigned, upcomingEvents] = await Promise.all([
			invoke("get_pinned_tasks_for_user", { userId }),
			invoke("get_favorite_tasks_for_user", { userId }),
			invoke("get_due_today_tasks_for_user", { userId }),
			invoke("get_assigned_tasks_for_user", { userId }),
			invoke("get_upcoming_events_for_current_user")
		]);

		// Update count displays
		updateCountDisplay('pinned-count', pinned.length);
		updateCountDisplay('favorites-count', favorites.length);
		updateCountDisplay('today-count', dueToday.length);
		updateCountDisplay('assigned-count', assigned.length);
		updateCountDisplay('upcoming-count', upcomingEvents ? upcomingEvents.length : 0);

		// Update today's stats
		updateCountDisplay('today-events', window.calendarInstance ? window.calendarInstance.getEvents().length : 0);
		updateCountDisplay('today-tasks', dueToday.length);

	} catch (err) {
		console.error("Error updating task counts:", err);
	}
}

function updateCountDisplay(elementId, count) {
	const element = document.getElementById(elementId);
	if (element) {
		element.textContent = count;
	}
}

// Color management functions
function getColorValue(colorName) {
	const colorMap = {
		'red': '#ea4335',
		'orange': '#ff9800',
		'yellow': '#fbbc04',
		'green': '#34a853',
		'teal': '#00bcd4',
		'blue': '#4285f4',
		'indigo': '#3f51b5',
		'purple': '#9c27b0',
		'pink': '#e91e63',
		'brown': '#795548',
		'gray': '#9aa0a6'
	};
	return colorMap[colorName] || '#00bcd4'; // Default to teal
}

function getColorClass(colorName) {
	const colorClassMap = {
		'red': 'figma-red',
		'orange': 'figma-orange',
		'yellow': 'figma-yellow',
		'green': 'figma-green',
		'teal': 'figma-teal',
		'blue': 'figma-blue',
		'indigo': 'figma-indigo',
		'purple': 'figma-purple',
		'pink': 'figma-pink',
		'brown': 'figma-brown',
		'gray': 'figma-gray'
	};
	return colorClassMap[colorName] || 'figma-teal';
}

function initializeEventModal() {
	// Reset form
	const form = document.getElementById('event-form');
	if (form) {
		form.reset();
	}

	// Reset all-day toggle to timed mode
	const allDayToggle = document.getElementById('all-day-toggle');
	const datetimeContainer = document.getElementById('datetime-container');
	const alldayContainer = document.getElementById('allday-container');

	if (allDayToggle) {
		allDayToggle.checked = false;
		datetimeContainer.classList.remove('hidden');
		alldayContainer.classList.add('hidden');
	}

	// Set default color (teal)
	const defaultColor = 'teal';
	const defaultColorValue = getColorValue(defaultColor);

	// Reset color picker to default
	const colorOptions = document.querySelectorAll('.color-option');
	colorOptions.forEach(opt => {
		opt.classList.remove('selected');
		opt.querySelector('.color-checkmark').classList.add('hidden');
	});

	const tealOption = document.querySelector('.color-option[data-color="teal"]');
	if (tealOption) {
		tealOption.classList.add('selected');
		tealOption.querySelector('.color-checkmark').classList.remove('hidden');
	}

	// Initialize color preview and label
	const selectedColorPreview = document.getElementById('selected-color-preview');
	const selectedColorLabel = document.getElementById('selected-color-label');

	if (selectedColorPreview) {
		selectedColorPreview.style.backgroundColor = defaultColorValue;
	}

	if (selectedColorLabel) {
		selectedColorLabel.textContent = defaultColor.charAt(0).toUpperCase() + defaultColor.slice(1);
	}

	// Set default selected color
	window.selectedEventColor = defaultColor;

	// Set default datetime values (30 minutes from now, 1 hour duration)
	const now = new Date();
	const startTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
	const endTime = new Date(startTime.getTime() + 60 * 60000); // 1 hour duration

	const fromInput = document.getElementById('event-from');
	const toInput = document.getElementById('event-to');

	if (fromInput && toInput) {
		fromInput.value = startTime.toISOString().slice(0, 16);
		toInput.value = endTime.toISOString().slice(0, 16);
	}

	// Set default frequency
	const frequencySelect = document.getElementById('event-frequency');
	if (frequencySelect) {
		frequencySelect.value = 'none';
	}

	// Clear any validation messages
	const inputs = form.querySelectorAll('input, textarea, select');
	inputs.forEach(input => {
		input.setCustomValidity('');
	});
}

function validateDateTime() {
	const fromInput = document.getElementById('event-from');
	const toInput = document.getElementById('event-to');

	if (fromInput && toInput) {
		const fromDate = new Date(fromInput.value);
		const toDate = new Date(toInput.value);

		if (fromDate && toDate && toDate <= fromDate) {
			toInput.setCustomValidity('End time must be after start time');
			toInput.reportValidity();
		} else {
			toInput.setCustomValidity('');
		}
	}
}

function updateDateTimeDisplay() {
	const fromInput = document.getElementById('event-from');
	const toInput = document.getElementById('event-to');
	const displayElement = document.getElementById('datetime-display');

	if (fromInput && toInput && displayElement) {
		const fromDate = new Date(fromInput.value);
		const toDate = new Date(toInput.value);

		if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
			const fromStr = fromDate.toLocaleDateString('en-US', {
				weekday: 'long',
				month: 'long',
				day: 'numeric'
			}) + ' ' + fromDate.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});

			const toStr = toDate.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});

			displayElement.textContent = `${fromStr} - ${toStr}`;
		}
	}
}

function verifyColorFieldState() {
	// Color field state verification (silent)
}

// ========== Delete Event Functions ==========

/**
 * Delete an event by its ID
 * @param {number} eventId - The ID of the event to delete
 * @returns {Promise<boolean>} - Returns true if deletion was successful
 */
async function deleteEvent(eventId) {
	const { invoke } = window.__TAURI__.core || {};
	if (!invoke) {
		console.error("Tauri API not available");
		throw new Error("Tauri API not available");
	}

	try {
		const result = await invoke('delete_event', { eventId: eventId });
		return result;
	} catch (error) {
		console.error('Failed to delete event:', error);
		throw error;
	}
}

/**
 * Delete event and refresh the calendar view
 * @param {number} eventId - The ID of the event to delete
 */
async function deleteEventAndRefresh(eventId) {
	try {
		// Optimistic UI update - remove event immediately
		// Try both string and number versions of the ID since FullCalendar may store them differently
		let event = window.calendarInstance.getEventById(eventId);
		if (!event) {
			event = window.calendarInstance.getEventById(eventId.toString());
		}
		if (event) {
			event.remove();
		}

		// Call the delete API
		const result = await deleteEvent(eventId);

		if (result) {
			showNotification('Event deleted successfully', 'success');

			// Update cache by removing the deleted event
			if (dataCache.events) {
				dataCache.events = dataCache.events.filter(ev => ev.id != eventId); // Use loose equality to handle string/number comparison
			}
			if (dataCache.upcomingEvents) {
				dataCache.upcomingEvents = dataCache.upcomingEvents.filter(ev => ev.id != eventId); // Use loose equality to handle string/number comparison
				// Update upcoming events in sidebar
				populateUpcomingEventsOptimized("upcoming-events-list", dataCache.upcomingEvents);
			}
		} else {
			// If deletion failed, reload the event
			showNotification('Failed to delete event. Please try again.', 'error');
			refreshCalendarData();
		}
	} catch (err) {
		console.error("Error in deleteEventAndRefresh:", err);
		// Provide more specific error message based on the error type
		if (err.message && err.message.includes('Tauri API not available')) {
			showNotification('Cannot delete event: Application error', 'error');
		} else {
			showNotification(`Error deleting event: ${err.message || 'Unknown error'}`, 'error');
		}

		// Reload events on error
		refreshCalendarData();
	}
}

/**
 * Show notification to user
 * @param {string} message - Message to display
 * @param {string} type - Type of notification ('success' or 'error')
 */
function showNotification(message, type) {
	// Create notification element
	const notification = document.createElement('div');
	notification.className = `notification ${type}`;
	notification.textContent = message;

	// Style the notification
	notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
  `;

	// Set background color based on type
	if (type === 'success') {
		notification.style.backgroundColor = '#10b981';
	} else if (type === 'error') {
		notification.style.backgroundColor = '#ef4444';
	} else {
		notification.style.backgroundColor = '#3b82f6';
	}

	// Add to page
	document.body.appendChild(notification);

	// Remove after 3 seconds
	setTimeout(() => {
		if (notification.parentNode) {
			notification.remove();
		}
	}, 3000);
}

// ========== Month Navigation Functions ==========

/**
 * Initialize month navigation functionality
 */
function initializeMonthNavigation() {
	const prevMonthBtn = document.getElementById('prev-month-btn');
	const nextMonthBtn = document.getElementById('next-month-btn');
	const goToTodayBtn = document.getElementById('go-to-today-btn');

	// Initialize current month display
	updateCurrentMonthDisplay();

	// Previous month button
	prevMonthBtn?.addEventListener('click', () => {
		navigateToPreviousMonth();
	});

	// Next month button
	nextMonthBtn?.addEventListener('click', () => {
		navigateToNextMonth();
	});

	// Go to today button (only if it exists)
	if (goToTodayBtn) {
		goToTodayBtn.addEventListener('click', () => {
			goToToday();
		});
	}
}

/**
 * Update current month display
 */
function updateCurrentMonthDisplay() {
	if (!window.calendarInstance) return;

	const currentDate = window.calendarInstance.getDate();
	const currentMonthName = document.getElementById('current-month-name');

	if (currentMonthName) {
		const monthYear = currentDate.toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric'
		});
		currentMonthName.textContent = monthYear;
	}
}

/**
 * Navigate to previous month
 */
function navigateToPreviousMonth() {
	if (!window.calendarInstance) return;

	const currentDate = window.calendarInstance.getDate();
	const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

	// Check if we're within the 2-year range (current year + next 2 years)
	const currentYear = new Date().getFullYear();
	const maxYear = currentYear + 2;

	if (prevMonth.getFullYear() >= currentYear) {
		window.calendarInstance.gotoDate(prevMonth);
		updateCurrentMonthDisplay();
		// showNotification('Previous month', 'info');
	} else {
		showNotification('Cannot navigate beyond current year', 'error');
	}
}

/**
 * Navigate to next month
 */
function navigateToNextMonth() {
	if (!window.calendarInstance) return;

	const currentDate = window.calendarInstance.getDate();
	const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

	// Check if we're within the 2-year range (current year + next 2 years)
	const currentYear = new Date().getFullYear();
	const maxYear = currentYear + 2;

	if (nextMonth.getFullYear() <= maxYear) {
		window.calendarInstance.gotoDate(nextMonth);
		updateCurrentMonthDisplay();
		// showNotification('Next month', 'info');
	} else {
		showNotification('Cannot navigate beyond 2 years from now', 'error');
	}
}

/**
 * Go to today's date
 */
function goToToday() {
	if (!window.calendarInstance) return;

	window.calendarInstance.today();
	updateCurrentMonthDisplay();

	showNotification('Navigated to today', 'info');
}

// ========== Sidebar Section Functions ==========

/**
 * Initialize sidebar expandable sections
 */
function initializeSidebarSections() {
	const sectionHeaders = document.querySelectorAll('.section-header');

	sectionHeaders.forEach(header => {
		header.addEventListener('click', () => {
			const targetId = header.getAttribute('data-target');
			const content = document.getElementById(targetId);
			const chevron = header.querySelector('.chevron-icon');

			if (content && chevron) {
				// Toggle the open class
				content.classList.toggle('open');
				chevron.classList.toggle('rotated');
			}
		});
	});
}

// ========== Task Selection Functions ==========

/**
 * Handle individual task checkbox selection
 * @param {Event} event - The checkbox change event
 * @param {Object} task - The task object
 */
function handleTaskSelection(event, task) {
	const checkbox = event.target;
	const taskId = task.id;
	const taskItem = checkbox.closest('.task-item');

	if (checkbox.checked) {
		selectedTasks.add(taskId);
		// Store task data for deletion
		selectedTasks[taskId] = task;
		// Add visual feedback
		if (taskItem) {
			taskItem.classList.add('selected');
		}
	} else {
		selectedTasks.delete(taskId);
		delete selectedTasks[taskId];
		// Remove visual feedback
		if (taskItem) {
			taskItem.classList.remove('selected');
		}
	}

	// Update delete button state
	updateDeleteSelectedButtonState();
}

/**
 * Update the state of the delete selected button
 */
function updateDeleteSelectedButtonState() {
	const deleteSelectedBtn = document.querySelector('.footer-btn[title="Delete"]');
	if (deleteSelectedBtn) {
		const hasSelectedTasks = selectedTasks.size > 0;
		deleteSelectedBtn.disabled = !hasSelectedTasks;
		deleteSelectedBtn.style.opacity = hasSelectedTasks ? '1' : '0.5';
		deleteSelectedBtn.style.cursor = hasSelectedTasks ? 'pointer' : 'not-allowed';
	}
}

/**
 * Handle delete selected tasks button click
 */
async function handleDeleteSelected() {
	if (selectedTasks.size === 0) {
		showNotification('No tasks selected', 'error');
		return;
	}

	try {
		// Convert Set to Array for processing
		const taskIds = Array.from(selectedTasks);
		
		// Check if any selected tasks are favorite or pinned before attempting deletion
		const { invoke } = window.__TAURI__.core || {};
		if (invoke) {
			console.log(`🔍 Checking favorite/pinned status for ${taskIds.length} selected tasks...`);
			
			const statusChecks = taskIds.map(async (taskId) => {
				const [isFavorited, isPinned] = await Promise.all([
					invoke("is_task_favorited", { taskId }),
					invoke("is_task_pinned", { taskId })
				]);
				return { taskId, isFavorited, isPinned };
			});

			const taskStatuses = await Promise.all(statusChecks);
			const protectedTasks = taskStatuses.filter(task => task.isFavorited || task.isPinned);

			if (protectedTasks.length > 0) {
				// Group protected tasks by status type
				const favoritedTasks = protectedTasks.filter(task => task.isFavorited && !task.isPinned);
				const pinnedTasks = protectedTasks.filter(task => !task.isFavorited && task.isPinned);
				const bothTasks = protectedTasks.filter(task => task.isFavorited && task.isPinned);

				let message = `Cannot delete ${protectedTasks.length} of the selected tasks because they are protected:\n\n`;
				
				if (bothTasks.length > 0) {
					message += `• ${bothTasks.length} task${bothTasks.length > 1 ? 's are' : ' is'} both favorited and pinned\n`;
				}
				if (favoritedTasks.length > 0) {
					message += `• ${favoritedTasks.length} task${favoritedTasks.length > 1 ? 's are' : ' is'} favorited\n`;
				}
				if (pinnedTasks.length > 0) {
					message += `• ${pinnedTasks.length} task${pinnedTasks.length > 1 ? 's are' : ' is'} pinned\n`;
				}
				
				message += '\nPlease unmark these tasks first and then try deleting them.';
				
				showNotification(message, 'error');
				return;
			}
		}

		// Show confirmation dialog
		const taskCount = selectedTasks.size;
		const confirmMessage = `Are you sure you want to delete ${taskCount} selected task${taskCount > 1 ? 's' : ''}? This action cannot be undone.`;
		
		if (!confirm(confirmMessage)) {
			return;
		}
		
		console.log(`✅ All selected tasks are safe to delete. Proceeding with deletion...`);
		
		// Delete tasks in parallel for better performance
		const deletePromises = taskIds.map(taskId => deleteTask(taskId));
		const results = await Promise.allSettled(deletePromises);

		// Check results
		const successCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
		const failureCount = taskIds.length - successCount;

		// Clear selections
		clearTaskSelections();

		// Show results and refresh data
		if (failureCount === 0) {
			showNotification(`Successfully deleted ${successCount} task${successCount > 1 ? 's' : ''}`, 'success');
		} else if (successCount === 0) {
			showNotification(`Failed to delete ${failureCount} task${failureCount > 1 ? 's' : ''}`, 'error');
		} else {
			showNotification(`Deleted ${successCount} task${successCount > 1 ? 's' : ''}, failed to delete ${failureCount}`, 'info');
		}

		// Refresh calendar data to update task lists
		showLoadingWithMessage('Updating task lists...');
		refreshCalendarData();

	} catch (error) {
		console.error('Error deleting selected tasks:', error);
		showNotification('Error deleting selected tasks', 'error');
	}
}

/**
 * Clear all task selections
 */
function clearTaskSelections() {
	// Clear the Set
	selectedTasks.clear();
	
	// Uncheck all checkboxes and remove visual feedback
	document.querySelectorAll('.task-checkbox').forEach(checkbox => {
		checkbox.checked = false;
		const taskItem = checkbox.closest('.task-item');
		if (taskItem) {
			taskItem.classList.remove('selected');
		}
	});
	
	// Update button state
	updateDeleteSelectedButtonState();
}

/**
 * Select all tasks in a specific list
 * @param {string} listId - The ID of the task list
 */
function selectAllTasksInList(listId) {
	const checkboxes = document.querySelectorAll(`#${listId} .task-checkbox`);
	checkboxes.forEach(checkbox => {
		if (!checkbox.checked) {
			checkbox.checked = true;
			checkbox.dispatchEvent(new Event('change'));
		}
	});
}

/**
 * Deselect all tasks in a specific list
 * @param {string} listId - The ID of the task list
 */
function deselectAllTasksInList(listId) {
	const checkboxes = document.querySelectorAll(`#${listId} .task-checkbox`);
	checkboxes.forEach(checkbox => {
		if (checkbox.checked) {
			checkbox.checked = false;
			checkbox.dispatchEvent(new Event('change'));
		}
	});
}

// ========== Task Creation Functions ==========

/**
 * Initialize the task modal with default values
 */
async function initializeTaskModal() {
	const { invoke } = window.__TAURI__.core || {};
	
	// Clear all form fields
	document.getElementById('task-title').value = '';
	document.getElementById('task-description').value = '';
	document.getElementById('task-status').value = '';
	document.getElementById('task-priority').value = '';
	document.getElementById('task-industry').value = '';
	
	// Set default due date to tomorrow
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	document.getElementById('task-due-date').value = tomorrow.toISOString().slice(0, 10);
	
	// Reset the assigned select
	const assignedSelect = document.getElementById('task-assigned-id');
	if (assignedSelect) {
		assignedSelect.selectedIndex = 0;
	}
	
	// Load and populate vaults dropdown
	try {
		const vaults = await invoke("fetch_vaults");
		const vaultSelect = document.getElementById('task-vault-id');
		
		// Clear existing options except the first one
		vaultSelect.innerHTML = '<option value="" disabled selected>Select Vault</option>';
		
		// Populate vault options
		vaults.forEach(vault => {
			const option = document.createElement('option');
			option.value = vault.id;
			option.textContent = vault.name;
			vaultSelect.appendChild(option);
		});
	} catch (error) {
		console.error("Error loading vaults:", error);
		showNotification('Error loading vaults', 'error');
	}
}