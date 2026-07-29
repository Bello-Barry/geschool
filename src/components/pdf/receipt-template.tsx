import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export interface ReceiptData {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  studentName: string;
  studentMatricule: string;
  className: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  receiptNumber: string;
  academicYear: string;
  generatedAt: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    textAlign: "center",
    marginBottom: 24,
    borderBottom: "2 solid #2563eb",
    paddingBottom: 12,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 6,
  },
  receiptMeta: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 4,
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  infoBlock: {
    gap: 3,
  },
  infoLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1f2937",
  },
  detailsTable: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2563eb",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    fontSize: 9,
    color: "#374151",
  },
  colLabel: { width: "40%" },
  colValue: { width: "60%", fontWeight: "bold" },
  amountSection: {
    marginBottom: 20,
    padding: 14,
    backgroundColor: "#eff6ff",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 9,
    color: "#1e40af",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a5f",
  },
  stampSection: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  stampBlock: {
    alignItems: "center",
    gap: 4,
  },
  stampLine: {
    width: 120,
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingTop: 4,
    fontSize: 8,
    color: "#6b7280",
    textAlign: "center",
  },
  footer: {
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
});

export default function ReceiptPDF({ data }: { data: ReceiptData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>{data.schoolName}</Text>
          {data.schoolAddress && (
            <Text style={{ fontSize: 8, color: "#6b7280" }}>
              {data.schoolAddress}
            </Text>
          )}
          {data.schoolPhone && (
            <Text style={{ fontSize: 8, color: "#6b7280" }}>
              {data.schoolPhone}
            </Text>
          )}
          <Text style={styles.receiptTitle}>REÇU DE PAIEMENT</Text>
          <Text style={styles.receiptMeta}>
            N° {data.receiptNumber} • {data.academicYear}
          </Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Élève</Text>
            <Text style={styles.infoValue}>{data.studentName}</Text>
            <Text style={styles.infoLabel}>Matricule</Text>
            <Text style={styles.infoValue}>{data.studentMatricule}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Classe</Text>
            <Text style={styles.infoValue}>{data.className}</Text>
            <Text style={styles.infoLabel}>Date de paiement</Text>
            <Text style={styles.infoValue}>{data.paymentDate}</Text>
          </View>
        </View>

        <View style={styles.detailsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colLabel]}>Détail</Text>
            <Text style={[styles.tableHeaderCell, styles.colValue]}>Information</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colLabel]}>Mode de paiement</Text>
            <Text style={[styles.tableCell, styles.colValue]}>{data.paymentMethod}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colLabel]}>Date</Text>
            <Text style={[styles.tableCell, styles.colValue]}>{data.paymentDate}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colLabel]}>Année scolaire</Text>
            <Text style={[styles.tableCell, styles.colValue]}>{data.academicYear}</Text>
          </View>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Montant payé</Text>
          <Text style={styles.amountValue}>
            {data.amount.toLocaleString("fr-FR")} ₣
          </Text>
        </View>

        <View style={styles.stampSection}>
          <View style={styles.stampBlock}>
            <Text style={{ fontSize: 9, color: "#374151" }}>Cachet de l'école</Text>
            <View style={{ width: 120, height: 60, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 4, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 7, color: "#9ca3af", textAlign: "center" }}>
                {data.schoolName}
              </Text>
            </View>
          </View>
          <View style={styles.stampBlock}>
            <Text style={{ fontSize: 9, color: "#374151" }}>Signature</Text>
            <Text style={styles.stampLine}>Direction</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Reçu généré le {data.generatedAt} • {data.schoolName}
        </Text>
      </Page>
    </Document>
  );
}
