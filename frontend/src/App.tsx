import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AllSummariesPage } from "@/pages/AllSummaries";
import { SummaryChatPage } from "@/pages/SummaryChat";
import { AdminPage } from "@/pages/Admin";
import { ManageModelsPage } from "@/pages/ManageModels";
import "./index.css";

function App() {
  const [currentPage, setCurrentPage] = useState("summaries");

  const renderPage = () => {
    switch (currentPage) {
      case "summaries":
        return <AllSummariesPage />;
      case "chat":
        return <SummaryChatPage />;
      case "admin":
        return <AdminPage />;
      case "models":
        return <ManageModelsPage />;
      default:
        return <AllSummariesPage />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </MainLayout>
  );
}

export default App;
