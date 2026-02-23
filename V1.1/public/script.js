document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("repairForm");
    const tableBody = document.querySelector("#repairsTable tbody");

    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("createdDate").value = today;

    async function loadRepairs() {
        const res = await fetch("/api/repairs");
        const data = await res.json();

        tableBody.innerHTML = "";
        data.forEach((r) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.createdDate}</td>
        <td>${r.creatorName}</td>
        <td>${r.deviceName}</td>
        <td>${r.description}</td>
        <td><input type="date" value="${r.repairDate || today}" data-field="repairDate"></td>
        <td><input type="text" value="${r.repairedBy || ""}" data-field="repairedBy"></td>
        <td><input type="text" value="${r.repairDetails || ""}" data-field="repairDetails"></td>
        <td><input type="checkbox" ${r.completed ? "checked" : ""} data-field="completed"></td>
      `;

            tr.querySelectorAll("input").forEach((input) => {
                input.addEventListener("change", async (e) => {
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
                });
            });

            tableBody.appendChild(tr);
        });
    }

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
        document.getElementById("createdDate").value = today;
        loadRepairs();
    });

    loadRepairs();
});
