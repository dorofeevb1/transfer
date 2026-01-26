(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // Находим все строки в таблице результатов
        const rows = document.querySelectorAll('#result_list tbody tr');

        rows.forEach(function(row) {
            // Находим первую ссылку в строке (ведет на редактирование)
            const link = row.querySelector('a');
            if (link) {
                const href = link.getAttribute('href');

                // Делаем всю строку кликабельной
                row.style.cursor = 'pointer';

                row.addEventListener('click', function(e) {
                    // Игнорируем клики по чекбоксам и ссылкам
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'A') {
                        return;
                    }
                    window.location.href = href;
                });
            }
        });
    });
})();
