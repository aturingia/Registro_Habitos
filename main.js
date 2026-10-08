let habits = JSON.parse(localStorage.getItem('habits_v2')) || [];
        let selectedColor = '#ef4444';
        let editingIndex = null;
        let currentYear = new Date().getFullYear();
        let currentMonth = new Date().getMonth();
        let showStats = false;
        let exportType = 'current';

        const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'];
        const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const DAY_NAMES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

        document.addEventListener('DOMContentLoaded', () => {
            renderAll();
            setupColorPickers();
            checkDarkMode();
            initExportDates();
        });

        function checkDarkMode() {
            const isDark = localStorage.getItem('darkMode') === 'true';
            if (isDark) {
                document.body.classList.add('dark-mode');
                document.querySelector('.theme-toggle').textContent = '☀️';
            }
        }

        function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            document.querySelector('.theme-toggle').textContent = isDark ? '☀️' : '🌙';
            localStorage.setItem('darkMode', isDark);
        }

        function toggleStats() {
            showStats = !showStats;
            document.getElementById('statsPanel').classList.toggle('active', showStats);
            if (showStats) renderDonutCharts();
        }

        function changeMonth(delta) {
            currentMonth += delta;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            } else if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderAll();
        }

        function setupColorPickers() {
            const colorOptions = document.querySelectorAll('#colorOptions .color-option');
            colorOptions.forEach(option => {
                option.addEventListener('click', () => {
                    colorOptions.forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    selectedColor = option.dataset.color;
                });
            });

            document.getElementById('customColor').addEventListener('input', (e) => {
                colorOptions.forEach(o => o.classList.remove('selected'));
                selectedColor = e.target.value;
            });
        }

        function initExportDates() {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            document.getElementById('exportDateFrom').valueAsDate = firstDay;
            document.getElementById('exportDateTo').valueAsDate = today;
            document.getElementById('exportCurrentMonth').textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
        }

        function openExportModal() {
            document.getElementById('exportCurrentMonth').textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
            document.getElementById('exportModal').classList.add('active');
        }

        function closeExportModal() {
            document.getElementById('exportModal').classList.remove('active');
        }

        function selectExportOption(el) {
            document.querySelectorAll('.export-option').forEach(o => o.classList.remove('selected'));
            el.classList.add('selected');
            exportType = el.dataset.type;
            document.getElementById('dateRange').classList.toggle('active', exportType === 'range');
        }

        function exportData() {
            if (habits.length === 0) {
                showToast('No hay datos para exportar');
                return;
            }

            let csv = '';
            let filename = '';

            if (exportType === 'current') {
                csv = generateMonthCSV(currentYear, currentMonth);
                filename = `habitos_${MONTH_NAMES[currentMonth]}_${currentYear}.csv`;
            } else if (exportType === 'all') {
                csv = generateAllDataCSV();
                filename = `habitos_todos_${new Date().getFullYear()}.csv`;
            } else {
                const from = document.getElementById('exportDateFrom').value;
                const to = document.getElementById('exportDateTo').value;
                if (!from || !to) {
                    showToast('Selecciona las fechas');
                    return;
                }
                csv = generateRangeCSV(from, to);
                filename = `habitos_${from}_${to}.csv`;
            }

            downloadCSV(csv, filename);
            closeExportModal();
            showToast('Archivo exportado exitosamente');
        }

        function generateMonthCSV(year, month) {
            const daysInMonth = getDaysInMonth(year, month);
            const headers = ['Hábito', 'Color', ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`), 'Total', 'Porcentaje'];
            let rows = [headers.join(',')];

            habits.forEach(habit => {
                const row = [escapeCSV(habit.name), habit.color];
                let completed = 0;

                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = formatDate(year, month, day);
                    const isCompleted = habit.completions[dateStr] ? 1 : 0;
                    row.push(isCompleted);
                    if (isCompleted) completed++;
                }

                const percentage = Math.round((completed / daysInMonth) * 100);
                row.push(completed, `${percentage}%`);
                rows.push(row.join(','));
            });

            return rows.join('\n');
        }

        function generateAllDataCSV() {
            const allDates = new Set();
            habits.forEach(habit => {
                Object.keys(habit.completions).forEach(date => allDates.add(date));
            });

            if (allDates.size === 0) {
                return 'No hay datos registrados';
            }

            const sortedDates = Array.from(allDates).sort();
            const headers = ['Hábito', 'Color', ...sortedDates];
            let rows = [headers.join(',')];

            habits.forEach(habit => {
                const row = [escapeCSV(habit.name), habit.color];
                sortedDates.forEach(date => {
                    row.push(habit.completions[date] ? 1 : 0);
                });
                rows.push(row.join(','));
            });

            return rows.join('\n');
        }

        function generateRangeCSV(from, to) {
            const fromDate = new Date(from);
            const toDate = new Date(to);
            const dates = [];

            for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
                dates.push(formatDate(d.getFullYear(), d.getMonth(), d.getDate()));
            }

            const headers = ['Hábito', 'Color', ...dates, 'Total', 'Porcentaje'];
            let rows = [headers.join(',')];

            habits.forEach(habit => {
                const row = [escapeCSV(habit.name), habit.color];
                let completed = 0;

                dates.forEach(date => {
                    const isCompleted = habit.completions[date] ? 1 : 0;
                    row.push(isCompleted);
                    if (isCompleted) completed++;
                });

                const percentage = Math.round((completed / dates.length) * 100);
                row.push(completed, `${percentage}%`);
                rows.push(row.join(','));
            });

            return rows.join('\n');
        }

        function escapeCSV(str) {
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }

        function downloadCSV(csv, filename) {
            downloadFile('\ufeff' + csv, filename, 'text/csv;charset=utf-8;');
        }

        function downloadFile(content, filename, mime) {
            const blob = new Blob([content], { type: mime });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        function exportJSON() {
            if (habits.length === 0) {
                showToast('No hay datos para exportar');
                return;
            }

            const payload = {
                app: 'Registro_Habitos',
                version: 2,
                exportedAt: new Date().toISOString(),
                habits: habits
            };

            const today = new Date();
            const filename = `habitos_backup_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.json`;
            downloadFile(JSON.stringify(payload, null, 2), filename, 'application/json;charset=utf-8;');
            showToast('Archivo JSON exportado exitosamente');
        }

        function importJSON() {
            document.getElementById('importFile').click();
        }

        function normalizeHabit(raw, index) {
            if (!raw || typeof raw !== 'object') return null;
            if (typeof raw.name !== 'string' || !raw.name.trim()) return null;

            const habit = {
                id: typeof raw.id === 'number' ? raw.id : Date.now() + index,
                name: raw.name.trim().slice(0, 50),
                color: typeof raw.color === 'string' && raw.color ? raw.color : COLORS[index % COLORS.length],
                createdAt: typeof raw.createdAt === 'string' && !isNaN(new Date(raw.createdAt)) ? raw.createdAt : new Date().toISOString(),
                completions: {}
            };

            if (raw.completions && typeof raw.completions === 'object') {
                Object.keys(raw.completions).forEach(date => {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && raw.completions[date]) {
                        habit.completions[date] = true;
                    }
                });
            }

            return habit;
        }

        function mergeHabits(incoming) {
            incoming.forEach(habit => {
                const existing = habits.find(h => h.id === habit.id);
                if (existing) {
                    Object.assign(existing.completions, habit.completions);
                } else {
                    habits.push(habit);
                }
            });
        }

        function handleImportFile(e) {
            const file = e.target.files[0];
            e.target.value = '';
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                let parsed;
                try {
                    parsed = JSON.parse(reader.result);
                } catch {
                    showToast('El archivo no es un JSON válido');
                    return;
                }

                const rawHabits = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.habits) ? parsed.habits : null);
                if (!rawHabits) {
                    showToast('Formato de archivo no reconocido');
                    return;
                }

                const incoming = rawHabits
                    .map((h, i) => normalizeHabit(h, i))
                    .filter(Boolean);

                if (incoming.length === 0) {
                    showToast('No se encontraron hábitos válidos');
                    return;
                }

                if (!confirm(`Se importarán ${incoming.length} hábito(s). ¿Continuar?`)) return;

                const replace = confirm('¿Reemplazar todos los hábitos actuales?\n\nAceptar = Reemplazar\nCancelar = Fusionar con los existentes');
                if (replace) {
                    habits = incoming;
                } else {
                    mergeHabits(incoming);
                }

                saveHabits();
                renderAll();
                showToast(replace ? 'Datos reemplazados correctamente' : 'Datos fusionados correctamente');
            };
            reader.onerror = () => showToast('No se pudo leer el archivo');
            reader.readAsText(file);
        }

        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        function addHabit() {
            const input = document.getElementById('habitInput');
            const name = input.value.trim();

            if (!name) {
                input.focus();
                return;
            }

            const habit = {
                id: Date.now(),
                name: name,
                color: selectedColor,
                createdAt: new Date().toISOString(),
                completions: {}
            };

            habits.unshift(habit);
            saveHabits();
            renderAll();
            input.value = '';
            input.focus();
        }

        function toggleDay(habitIndex, dateStr) {
            const habit = habits[habitIndex];
            if (habit.completions[dateStr]) {
                delete habit.completions[dateStr];
            } else {
                habit.completions[dateStr] = true;
            }
            saveHabits();
            renderAll();
        }

        function deleteHabit(index) {
            if (confirm('¿Eliminar este hábito y su historial?')) {
                habits.splice(index, 1);
                saveHabits();
                renderAll();
            }
        }

        function openEditModal(index) {
            editingIndex = index;
            const habit = habits[index];
            document.getElementById('editInput').value = habit.name;

            const colorOptions = document.getElementById('editColorOptions');
            colorOptions.innerHTML = '';

            COLORS.forEach(color => {
                const option = document.createElement('div');
                option.className = 'color-option' + (color === habit.color ? ' selected' : '');
                option.dataset.color = color;
                option.style.background = color;
                option.addEventListener('click', () => {
                    document.querySelectorAll('#editColorOptions .color-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                });
                colorOptions.appendChild(option);
            });

            document.getElementById('editModal').classList.add('active');
        }

        function closeModal() {
            document.getElementById('editModal').classList.remove('active');
            editingIndex = null;
        }

        function saveEdit() {
            const newName = document.getElementById('editInput').value.trim();
            if (!newName) return;

            const selectedColorEl = document.querySelector('#editColorOptions .color-option.selected');
            habits[editingIndex].name = newName;
            if (selectedColorEl) {
                habits[editingIndex].color = selectedColorEl.dataset.color;
            }

            saveHabits();
            renderAll();
            closeModal();
        }

        function clearAll() {
            if (habits.length === 0) return;
            if (confirm('¿Eliminar todos los hábitos?')) {
                habits = [];
                saveHabits();
                renderAll();
            }
        }

        function saveHabits() {
            localStorage.setItem('habits_v2', JSON.stringify(habits));
        }

        function getDaysInMonth(year, month) {
            return new Date(year, month + 1, 0).getDate();
        }

        function getFirstDayOfMonth(year, month) {
            return new Date(year, month, 1).getDay();
        }

        function formatDate(year, month, day) {
            return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        function getToday() {
            const now = new Date();
            return formatDate(now.getFullYear(), now.getMonth(), now.getDate());
        }

        function calculateHabitStats(habit, year, month) {
            const daysInMonth = getDaysInMonth(year, month);
            const createdDate = new Date(habit.createdAt);
            const createdStr = formatDate(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());

            let activeDays = 0;
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = formatDate(year, month, day);
                if (dateStr >= createdStr) {
                    activeDays++;
                }
            }

            let completed = 0;
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = formatDate(year, month, day);
                if (dateStr >= createdStr && habit.completions[dateStr]) {
                    completed++;
                }
            }

            return {
                completed,
                activeDays,
                percentage: activeDays > 0 ? Math.round((completed / activeDays) * 100) : 0
            };
        }

        function renderAll() {
            document.getElementById('monthTitle').textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
            renderSummary();
            renderHabits();
            if (showStats) renderDonutCharts();
        }

        function renderSummary() {
            const today = getToday();
            const todayParts = today.split('-').map(Number);
            const isCurrentMonth = todayParts[0] === currentYear && todayParts[1] - 1 === currentMonth;

            document.getElementById('totalHabits').textContent = habits.length;

            if (isCurrentMonth) {
                const completedToday = habits.filter(h => h.completions[today]).length;
                document.getElementById('completedToday').textContent = `${completedToday}/${habits.length}`;
            } else {
                document.getElementById('completedToday').textContent = '-';
            }

            if (habits.length > 0) {
                const totalPercent = Math.round(habits.reduce((sum, h) => sum + calculateHabitStats(h, currentYear, currentMonth).percentage, 0) / habits.length);
                document.getElementById('globalPercent').textContent = `${totalPercent}%`;
                document.getElementById('globalProgressFill').style.width = `${totalPercent}%`;
            } else {
                document.getElementById('globalPercent').textContent = '0%';
                document.getElementById('globalProgressFill').style.width = '0%';
            }
        }

        function renderHabits() {
            const list = document.getElementById('habitsList');

            if (habits.length === 0) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">✨</div>
                        <p>¡Comienza agregando tu primer hábito!</p>
                    </div>
                `;
                return;
            }

            const daysInMonth = getDaysInMonth(currentYear, currentMonth);
            const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
            const today = getToday();

            const dayHeaders = DAY_NAMES.map(d => `<div class="day-header">${d}</div>`).join('');

            list.innerHTML = habits.map((habit, habitIndex) => {
                const stats = calculateHabitStats(habit, currentYear, currentMonth);

                let calendarCells = '';
                for (let i = 0; i < firstDay; i++) {
                    calendarCells += '<div class="day-cell empty"></div>';
                }

                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = formatDate(currentYear, currentMonth, day);
                    const isCompleted = habit.completions[dateStr];
                    const isToday = dateStr === today;
                    calendarCells += `
                        <div class="day-cell ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}" 
                             style="--habit-color: ${habit.color}"
                             onclick="toggleDay(${habitIndex}, '${dateStr}')"
                             title="${dateStr}">
                            ${day}
                        </div>
                    `;
                }

                return `
                    <div class="habit-card">
                        <div class="habit-header">
                            <div class="habit-color" style="background: ${habit.color}"></div>
                            <div class="habit-info">
                                <div class="habit-name">${escapeHtml(habit.name)}</div>
                                <div class="habit-stats">${stats.completed}/${stats.activeDays} días • ${stats.percentage}%</div>
                            </div>
                            <div class="habit-actions">
                                <button class="btn-icon btn-edit" onclick="openEditModal(${habitIndex})">✏️</button>
                                <button class="btn-icon btn-delete" onclick="deleteHabit(${habitIndex})">🗑️</button>
                            </div>
                        </div>
                        <div class="calendar-grid">${dayHeaders}${calendarCells}</div>
                    </div>
                `;
            }).join('');
        }

        function renderDonutCharts() {
            const container = document.getElementById('donutContainer');

            if (habits.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Agrega hábitos para ver estadísticas</p>';
                return;
            }

            const statsPerHabit = habits.map(habit => calculateHabitStats(habit, currentYear, currentMonth));
            const globalPercent = Math.round(statsPerHabit.reduce((sum, s) => sum + s.percentage, 0) / habits.length);

            const segments = habits.map((habit, index) => ({
                color: habit.color,
                value: statsPerHabit[index].completed
            }));

            const legend = habits.map((habit, index) => {
                const stats = statsPerHabit[index];
                return `
                    <div class="donut-legend-item">
                        <span class="legend-dot" style="background: ${habit.color}"></span>
                        <span class="donut-legend-name" title="${escapeHtml(habit.name)}">${escapeHtml(habit.name)}</span>
                        <span class="donut-legend-value">${stats.completed}/${stats.activeDays} días • ${stats.percentage}%</span>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div class="donut-item">
                    <div class="donut-wrapper donut-lg">
                        <canvas id="donut-total" width="160" height="160"></canvas>
                        <div class="donut-center">
                            <div class="donut-percent" style="color: var(--accent)">${globalPercent}%</div>
                        </div>
                    </div>
                    <div class="donut-label">Progreso del mes</div>
                </div>
                <div class="donut-legend">${legend}</div>
            `;

            drawDonut('donut-total', segments);
        }

        function drawDonut(canvasId, segments) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const size = canvas.width;
            const centerX = size / 2;
            const centerY = size / 2;
            const radius = size * 0.4;
            const lineWidth = size * 0.08;

            ctx.clearRect(0, 0, size, size);

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || '#e0e0e0';
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'butt';
            ctx.stroke();

            const total = segments.reduce((sum, s) => sum + s.value, 0);
            if (total <= 0) return;

            const gap = 0.03;
            let startAngle = 0;

            segments.forEach(segment => {
                if (segment.value <= 0) return;
                const sweep = (segment.value / total) * 2 * Math.PI;
                const padded = Math.max(sweep - gap, 0.01);
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, startAngle + gap / 2, startAngle + gap / 2 + padded);
                ctx.strokeStyle = segment.color;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
                startAngle += sweep;
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        document.getElementById('habitInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addHabit();
        });

        document.getElementById('editInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveEdit();
        });

        document.getElementById('importFile').addEventListener('change', handleImportFile);

        window.addEventListener('resize', () => {
            if (showStats) renderDonutCharts();
        });
