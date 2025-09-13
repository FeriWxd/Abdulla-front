// src/admin/AdminHomeworkControl.jsx
import React from "react";
import GroupCard from "./GroupCard";

/**
 * AdminTeaching sayfasının "Ödev Kontrol" modunda kullanılacak ince sarmalayıcı.
 * Seçilen grup adını props ile alır ve direkt GroupCard'ı gösterir.
 */
export default function AdminHomeworkControl({ groupName }) {
  if (!groupName) {
    return (
      <div className="teach-card list">
        Kontrol için önce üstten bir grup seç.
      </div>
    );
  }

  return (
    <div className="teach-card" style={{ padding: 12 }}>
      <GroupCard groupName={groupName} />
    </div>
  );
}
