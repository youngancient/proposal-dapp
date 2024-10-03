import { Box } from "@radix-ui/themes";
import Layout from "./components/Layout";
import CreateProposalModal from "./components/CreateProposalModal";
import {useAllProposals, useMulticallAllProposals} from "./hooks/useAllProposals";
import { useEffect } from "react";
import Proposals from "./components/Proposals";

function App() {
  const proposals = useMulticallAllProposals();
  
  return (
    <Layout>
      <Box className="flex justify-end p-4">
        <CreateProposalModal />
      </Box>
      <Proposals proposals={proposals} />
    </Layout>
  );
}

export default App;
