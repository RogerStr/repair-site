function formatDateToDDMMYYYY(date) {
    if (!date) return "";
    if (typeof date === "string" && date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        return date;
    }
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("repairForm");
    const createdDateInput = document.getElementById("createdDate");
    const openTableBody = document.querySelector("#openRepairsTable tbody");
    const doneTableBody = document.querySelector("#doneRepairsTable tbody");

    // Automatisch heutiges Datum vorschlagen
    const todayFormatted = formatDateToDDMMYYYY(new Date());
    createdDateInput.value = todayFormatted;

    // Reparaturen laden und anzeigen
    async function loadRepairs() {
        try {
            const res = await fetch("/api/repairs");
            const repairs = await res.json();

            openTableBody.innerHTML = "";
            doneTableBody.innerHTML = "";

            repairs.forEach((r) => {
                if (r.completed) {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
            <td>${r.id}</td>
            <td>${formatDateToDDMMYYYY(r.createdDate)}</td>
            <td>${r.creatorName}</td>
            <td>${r.deviceName}</td>
            <td>${r.description}</td>
            <td>${formatDateToDDMMYYYY(r.repairDate)}</td>
            <td>${r.repairedBy || ""}</td>
            <td>${r.repairDetails || ""}</td>
          `;
                    doneTableBody.appendChild(tr);
                } else {
                    const tr = document.createElement("tr");
                    const repairDateValue = r.repairDate
                        ? formatDateToDDMMYYYY(r.repairDate)
                        : todayFormatted;

                    tr.innerHTML = `
            <td>${r.id}</td>
            <td>${formatDateToDDMMYYYY(r.createdDate)}</td>
            <td>${r.creatorName}</td>
            <td>${r.deviceName}</td>
            <td>${r.description}</td>
            <td><input type="text" value="${repairDateValue}" data-field="repairDate" placeholder="TT.MM.JJJJ"></td>
            <td><input type="text" value="${r.repairedBy || ""}" data-field="repairedBy"></td>
            <td><input type="text" value="${r.repairDetails || ""}" data-field="repairDetails"></td>
            <td><input type="checkbox" ${r.completed ? "checked" : ""} data-field="completed"></td>
          `;

                    tr.querySelectorAll("input").forEach((input) => {
                        input.addEventListener("change", async () => {
                            const updated = {
                                repairDate: tr.querySelector('[data-field="repairDate"]').value,
                                repairedBy: tr.querySelector('[data-field="repairedBy"]').value,
                                repairDetails: tr.querySelector('[data-field="repairDetails"]').value,
                                completed: tr.querySelector('[data-field="completed"]').checked,
                            };

                            await fetch(`/api/repairs/${r.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(updated),
                            });

                            // Nach Änderung neu laden
                            await loadRepairs();
                        });
                    });

                    openTableBody.appendChild(tr);
                }
            });
        } catch (err) {
            console.error("Fehler beim Laden:", err);
        }
    }

    // Neuen Eintrag speichern
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            createdDate: createdDateInput.value || todayFormatted,
            creatorName: document.getElementById("creatorName").value,
            deviceName: document.getElementById("deviceName").value,
            description: document.getElementById("description").value,
        };

        try {
            const res = await fetch("/api/repairs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            console.log("Gespeichert:", result);
            form.reset();
            createdDateInput.value = todayFormatted;

            await loadRepairs(); // jetzt sofort Liste aktualisieren
        } catch (err) {
            console.error("Fehler beim Speichern:", err);
        }
    });

    // Initial laden nach dem Start
    loadRepairs();
});
