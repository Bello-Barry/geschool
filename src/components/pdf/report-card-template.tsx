import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export interface SubjectAverage {
  subjectName: string;
  coefficient: number;
  average: number;
  maxScore: number;
  appreciation: string;
}

export interface ReportCardData {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  studentName: string;
  studentMatricule: string;
  className: string;
  termName: string;
  academicYear: string;
  subjectAverages: SubjectAverage[];
  generalAverage: number;
  classRank?: number;
  totalStudents?: number;
  teacherComment?: string;
  generatedAt: string;
}

const APPRECIATIONS = [
  { min: 18, label: "Excellent" },
  { min: 16, label: "Très bien" },
  { min: 14, label: "Bien" },
  { min: 12, label: "Assez bien" },
  { min: 10, label: "Passable" },
  { min: 0, label: "Insuffisant" },
];

function getAppreciation(average: number): string {
  for (const a of APPRECIATIONS) {
    if (average >= a.min) return a.label;
  }
  return "Insuffisant";
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
    marginBottom: 20,
    borderBottom: "2 solid #2563eb",
    paddingBottom: 10,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 2,
  },
  studentInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    padding: 10,
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
  table: {
    marginBottom: 16,
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
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#f9fafb",
  },
  tableCell: {
    fontSize: 9,
    color: "#374151",
  },
  colSubject: { width: "30%" },
  colCoeff: { width: "12%", textAlign: "center" },
  colAverage: { width: "15%", textAlign: "center" },
  colMax: { width: "10%", textAlign: "center" },
  colAppreciation: { width: "33%", textAlign: "right" },
  summary: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#1e40af",
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e3a5f",
  },
  commentSection: {
    marginBottom: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    minHeight: 40,
  },
  commentLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
  },
  commentText: {
    fontSize: 10,
    color: "#374151",
  },
  footer: {
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
});

export default function ReportCardPDF({ data }: { data: ReportCardData }) {
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
          <Text style={styles.reportTitle}>BULLETIN DE NOTES</Text>
          <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 2 }}>
            Année scolaire {data.academicYear}
          </Text>
        </View>

        <View style={styles.studentInfo}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Élève</Text>
            <Text style={styles.infoValue}>{data.studentName}</Text>
            <Text style={styles.infoLabel}>Matricule</Text>
            <Text style={styles.infoValue}>{data.studentMatricule}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Classe</Text>
            <Text style={styles.infoValue}>{data.className}</Text>
            <Text style={styles.infoLabel}>Trimestre</Text>
            <Text style={styles.infoValue}>{data.termName}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colSubject]}>Matière</Text>
            <Text style={[styles.tableHeaderCell, styles.colCoeff]}>Coeff.</Text>
            <Text style={[styles.tableHeaderCell, styles.colAverage]}>Moy.</Text>
            <Text style={[styles.tableHeaderCell, styles.colMax]}>/20</Text>
            <Text style={[styles.tableHeaderCell, styles.colAppreciation]}>Appréciation</Text>
          </View>
          {data.subjectAverages.map((sub, i) => (
            <View
              key={i}
              style={i % 2 === 0 ? [styles.tableRow, styles.tableRowEven] : [styles.tableRow]}
            >
              <Text style={[styles.tableCell, styles.colSubject]}>
                {sub.subjectName}
              </Text>
              <Text style={[styles.tableCell, styles.colCoeff]}>
                {sub.coefficient}
              </Text>
              <Text style={[styles.tableCell, styles.colAverage]}>
                {sub.average.toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, styles.colMax]}>
                {sub.maxScore}
              </Text>
              <Text style={[styles.tableCell, styles.colAppreciation]}>
                {getAppreciation(sub.average)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Moyenne générale</Text>
            <Text style={styles.summaryValue}>
              {data.generalAverage.toFixed(2)} / 20
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mention</Text>
            <Text style={styles.summaryValue}>
              {getAppreciation(data.generalAverage)}
            </Text>
          </View>
          {data.classRank != null && data.totalStudents != null && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rang</Text>
              <Text style={styles.summaryValue}>
                {data.classRank}ᵉ / {data.totalStudents}
              </Text>
            </View>
          )}
        </View>

        {data.teacherComment && (
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Commentaire du professeur</Text>
            <Text style={styles.commentText}>{data.teacherComment}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Généré le {data.generatedAt} • {data.schoolName}
        </Text>
      </Page>
    </Document>
  );
}

export { getAppreciation };
