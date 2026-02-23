// Datum in Format TT.MM.JJJJ umwandeln
function formatDateToDDMMYYYY(date) {
    if (!date) return "";
    const parts = typeof date === "string" ? date.split(/[.\-\/]/) : [];
    if (parts.length === 3 && parts[2].length === 4) return date; // schon dd.mm.yyyy
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("repairForm");
    const openTableBody = document.querySelector("#openRepairsTable tbody");
    const doneTableBody = document.querySelector("#doneRepairsTable tbody");

    const todayFormatted = formatDateToDDMMYYYY(new Date());
    document.getElementById("createdDate").value = todayFormatted;

    // Reparaturen laden und in offene / erledigte trennen
    async function loadRepairs() {
        const res = await fetch("/api/repairs");
        const data = await res.json();

        openTableBody.innerHTML = "";
        doneTableBody.innerHTML = "";

        data.forEach((r) => {
            if (r.completed) {
                // erledigte Reparaturen
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
                // offene Reparaturen (editierbar)
                const tr = document.createElement("tr");
                const repairDateFormatted = formatDateToDDMMYYYY(r.repairDate || new Date());
                tr.innerHTML = `
          <td>${r.id}</td>
          <td>${formatDateToDDMMYYYY(r.createdDate)}</td>
          <td>${r.creatorName}</td>
          <td>${r.deviceName}</td>
          <td>${r.description}</td>
          <td><input type="text" value="${repairDateFormatted}" data-field="repairDate" placeholder="TT.MM.JJJJ"></td>
          <td><input type="text" value="${r.repairedBy || ""}" data-field="repairedBy"></td>
          <td><input type="text" value="${r.repairDetails || ""}" data-field="repairDetails"></td>
          <td><input type="checkbox" ${r.completed ? "checked" : ""} data-field="completed"></td>
        `;

                // Änderungen speichern
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
                        loadRepairs(); // Liste neu laden, damit Eintrag ggf. verschoben wird
                    });
                });

                openTableBody.appendChild(tr);
            }
        });
    }

    // Formular absenden
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            createdDate: document.getElementById("createdDate").value,
            creatorName: document.getElementById("creatorName").value,
            deviceName: document.getElementById("deviceName").value,
            description: document.getElementById("description").value,
        };

        await fetch("/api/repairs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        form.reset();
        document.getElementById("createdDate").value = todayFormatted;
        loadRepairs();
    });

    loadRepairs();
});

