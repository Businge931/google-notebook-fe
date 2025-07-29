import { AppProvider } from "./contexts/AppContext";
import { QueryProvider } from "./providers/QueryProvider";
import MainLayoutWithQuery from "./components/layout/MainLayoutWithQuery";

function App() {
  return (
    <QueryProvider>
      <AppProvider>
        <div className="w-full h-screen">
          <MainLayoutWithQuery />
        </div>
      </AppProvider>
    </QueryProvider>
  );
}

export default App;
