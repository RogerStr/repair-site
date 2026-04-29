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

function parsePhotos(photosJson) {
    try { return JSON.parse(photosJson || "[]"); } catch (e) { return []; }
}

function renderPhotosReadonly(photosJson) {
    const photos = parsePhotos(photosJson);
    if (!photos.length) return "";
    return photos.map(p => `<span class="photo-thumb"><a href="${p}" target="_blank"><img src="${p}"></a><img class="photo-zoom" src="${p}"></span>`).join("");
}

function renderPhotosEditable(photosJson, repairId, onChanged) {
    const container = document.createElement("div");
    const photos = parsePhotos(photosJson);

    photos.forEach(p => {
        const wrapper = document.createElement("span");
        wrapper.className = "photo-thumb";
        wrapper.style.position = "relative";
        wrapper.innerHTML = `
            <a href="${p}" target="_blank"><img src="${p}"></a>
            <img class="photo-zoom" src="${p}">
            <button type="button" title="Foto löschen" style="position:absolute;top:-5px;right:-5px;background:red;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:12px;cursor:pointer;line-height:18px;padding:0">&times;</button>
        `;
        wrapper.querySelector("button").addEventListener("click", async () => {
            await fetch(`/api/repairs/${repairId}/photos`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ photo: p }),
            });
            onChanged();
        });
        container.appendChild(wrapper);
    });

    const addBtn = document.createElement("label");
    addBtn.style.cssText = "display:inline-block;cursor:pointer;margin:2px;padding:4px 8px;background:#4CAF50;color:#fff;border-radius:4px;font-size:12px";
    addBtn.textContent = "+ Foto";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.style.display = "none";
    addBtn.appendChild(fileInput);

    fileInput.addEventListener("change", async () => {
        if (!fileInput.files.length) return;
        const formData = new FormData();
        for (const file of fileInput.files) {
            formData.append("photos", file);
        }
        await fetch(`/api/repairs/${repairId}/photos`, {
            method: "POST",
            body: formData,
        });
        onChanged();
    });

    container.appendChild(addBtn);
    return container;
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("repairForm");
    const createdDateInput = document.getElementById("createdDate");
    const openTableBody = document.querySelector("#openRepairsTable tbody");
    const doneTableBody = document.querySelector("#doneRepairsTable tbody");

    const photosInput = document.getElementById("photosInput");
    const photosPreview = document.getElementById("photosPreview");
    let collectedPhotos = [];

    function renderPhotoPreview() {
        photosPreview.innerHTML = "";
        collectedPhotos.forEach((file, idx) => {
            const wrapper = document.createElement("span");
            wrapper.style.cssText = "display:inline-block;position:relative;margin:2px";
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.style.cssText = "max-width:60px;max-height:60px;border-radius:4px";
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "\u00d7";
            btn.title = "Entfernen";
            btn.style.cssText = "position:absolute;top:-5px;right:-5px;background:red;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:12px;cursor:pointer;line-height:18px;padding:0";
            btn.addEventListener("click", () => {
                collectedPhotos.splice(idx, 1);
                renderPhotoPreview();
            });
            wrapper.appendChild(img);
            wrapper.appendChild(btn);
            photosPreview.appendChild(wrapper);
        });
    }

    photosInput.addEventListener("change", () => {
        for (const file of photosInput.files) {
            collectedPhotos.push(file);
        }
        photosInput.value = "";
        renderPhotoPreview();
    });

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

            const openCount = repairs.filter(r => !r.completed).length;
            document.getElementById("openCount").textContent = openCount;

            repairs.forEach((r) => {
                if (r.completed) {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
            <td>${r.id}</td>
            <td>${formatDateToDDMMYYYY(r.createdDate)}</td>
            <td>${r.creatorName}</td>
            <td>${r.deviceName}</td>
            <td style="white-space: pre-wrap">${r.description}</td>
            <td>${renderPhotosReadonly(r.photos)}</td>
            <td>${formatDateToDDMMYYYY(r.repairDate)}</td>
            <td>${r.repairedBy || ""}</td>
            <td style="white-space: pre-wrap">${r.repairDetails || ""}</td>
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
            <td><input type="text" value="${r.deviceName || ""}" data-field="deviceName"></td>
            <td><textarea data-field="description">${r.description || ""}</textarea></td>
            <td class="photos-cell"></td>
            <td><input type="text" value="${repairDateValue}" data-field="repairDate" placeholder="TT.MM.JJJJ" ></td>
            <td><input type="text" value="${r.repairedBy || ""}" data-field="repairedBy"></td>
            <td><textarea data-field="repairDetails">${r.repairDetails || ""}</textarea></td>
            <td><input type="checkbox" ${r.completed ? "checked" : ""} data-field="completed"></td>
          `;

                    const photosCell = tr.querySelector(".photos-cell");
                    photosCell.appendChild(renderPhotosEditable(r.photos, r.id, loadRepairs));

                    tr.querySelectorAll("input, textarea").forEach((input) => {
                        input.addEventListener("change", async () => {
                            const updated = {
                                deviceName: tr.querySelector('[data-field="deviceName"]').value,
                                description: tr.querySelector('[data-field="description"]').value,
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

        const formData = new FormData();
        formData.append("createdDate", createdDateInput.value || todayFormatted);
        formData.append("creatorName", document.getElementById("creatorName").value);
        formData.append("deviceName", document.getElementById("deviceName").value);
        formData.append("description", document.getElementById("description").value);

        for (const file of collectedPhotos) {
            formData.append("photos", file);
        }

        try {
            const res = await fetch("/api/repairs", {
                method: "POST",
                body: formData,
            });

            const result = await res.json();
            console.log("Gespeichert:", result);
            form.reset();
            collectedPhotos = [];
            renderPhotoPreview();
            createdDateInput.value = todayFormatted;

            await loadRepairs(); // jetzt sofort Liste aktualisieren
        } catch (err) {
            console.error("Fehler beim Speichern:", err);
        }
    });

    // Initial laden nach dem Start
    loadRepairs();
});
