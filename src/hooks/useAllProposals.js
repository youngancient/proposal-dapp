import { useCallback, useEffect, useState } from "react";
import useContract from "./useContract";
import { Contract, ethers } from "ethers";
import useRunners from "./useRunners";
import { Interface } from "ethers";
import ABI from "../ABI/proposal.json";
import { ErrorDecoder } from "ethers-decode-error";
import { toast } from "react-toastify";
import { useAppKitAccount } from "@reown/appkit/react";

// without using Multicall
export const useAllProposals = () => {
  const [allProposals, setAllProposals] = useState([]);
  const readOnlyProposalContract = useContract();

  const fetchAllProposals = useCallback(async () => {
    if (!readOnlyProposalContract) return;
    try {
      // gets the count of proposals
      // note: the contract has a bug, if returns 1 more than the actual count of proposals
      const proposalCount = Number(
        await readOnlyProposalContract.proposalCount()
      );

      // we subtract 1 from the length
      const proposalIdArray = Array.from(
        { length: proposalCount - 1 },
        (_, i) => i + 1
      );

      const promises = proposalIdArray.map((i) =>
        readOnlyProposalContract.proposals(i)
      );
      const responses = await Promise.all(promises);

      // let data = [];

      const data = responses.map((proposalStruct) => ({
        description: proposalStruct.description,
        amount: proposalStruct.amount,
        minRequiredVote: proposalStruct.minVotesToPass,
        voteCount: proposalStruct.voteCount,
        deadline: proposalStruct.votingDeadline,
        executed: proposalStruct.executed,
      }));

      setAllProposals(data);
    } catch (error) {
      console.log("error fetching all proposals: ", error);
    }
  }, [readOnlyProposalContract]);

  // useEffect(() => {
  //   fetchAllProposals();
  // }, [fetchAllProposals]);

  // return allProposals;
};

const multiCallABI = [
  "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
];

export const useMulticallAllProposals = () => {
  const [allProposals, setAllProposals] = useState([]);

  const readOnlyProposalContract = useContract();
  const { readOnlyProvider } = useRunners();

  const { address } = useAppKitAccount();

  const errorDecoder = ErrorDecoder.create();

  const fetchBlockTimestamp = async () => {
    try {
      const latestBlock = await readOnlyProvider.getBlock("latest");
      return latestBlock.timestamp;
    } catch (error) {
      console.log("error fetching block timestamp: ", error);
    }
  };

  const fetchAllProposals = useCallback(
    async () => {
      if (!readOnlyProposalContract) return;
      if (!address) return;

      const multicallContract = new Contract(
        import.meta.env.VITE_MULTICALL_ADDRESS,
        multiCallABI,
        readOnlyProvider
      );

      // if (!address) return;
      // contract interface

      const iface = new Interface(ABI);

      try {
        const proposalCount = Number(
          await readOnlyProposalContract.proposalCount()
        );

        // we subtract 1 from the length
        const proposalIdArray = Array.from(
          { length: proposalCount - 1 },
          (_, i) => i + 1
        );

        const calls = proposalIdArray.map((id) => ({
          target: import.meta.env.VITE_CONTRACT_ADDRESS,
          callData: iface.encodeFunctionData("proposals", [id]),
        }));

        const responses = await multicallContract.tryAggregate.staticCall(
          true,
          calls
        );
        const decodedResults = responses.map((response) =>
          iface.decodeFunctionResult("proposals", response.returnData)
        );

        // using multiCall to call contract function
        const isVotedCalls = proposalIdArray.map((id) => ({
          target: import.meta.env.VITE_CONTRACT_ADDRESS,
          callData: iface.encodeFunctionData("hasVoted", [address, id]),
        }));
        const isVotedResponses =
          await multicallContract.tryAggregate.staticCall(true, isVotedCalls);
        const decodedIsVotedResults = isVotedResponses.map((response) =>
          iface.decodeFunctionResult("hasVoted", response.returnData)
        );

        // using eventFilters
        // const votedFilter = readOnlyProposalContract.filters.Voted(null,address);
        // const votedEvents = await readOnlyProposalContract.queryFilter(votedFilter);
        // console.log(votedEvents);
        const blockTime = await fetchBlockTimestamp();

        console.log("block time: ", blockTime);

        const data = decodedResults.map((proposalStruct, index) => ({
          id: proposalIdArray[index],
          description: proposalStruct.description,
          amount: proposalStruct.amount,
          minRequiredVote: proposalStruct.minVotesToPass,
          voteCount: Number(proposalStruct.voteCount),
          deadline: proposalStruct.votingDeadline,
          executed: proposalStruct.executed,
          isVoted: decodedIsVotedResults[index][0],
          isDeadlinePassed: blockTime > Number(proposalStruct.votingDeadline),
        }));

        // console.log(data);

        setAllProposals(data);
      } catch (error) {
        const decodedError = await errorDecoder.decode(error);
        toast.error(decodedError.reason);
      }
    },
    [readOnlyProposalContract, address],
    readOnlyProvider
  );

  useEffect(() => {
    fetchAllProposals();
  }, [fetchAllProposals]);

  const createdProposalEventHandler = useCallback(
    (proposalId, description, _, amount, votingDeadline, minVotesToPass) => {
      const newProposal = {
        id: proposalId,
        description,
        amount,
        minRequiredVote: minVotesToPass,
        voteCount: 0,
        deadline: votingDeadline,
        executed: false,
        isVoted: false,
      };
      // console.log(newProposal.id);
      // Update the state with the new proposal, prepend it to the list
      setAllProposals((prevProposals) => [...prevProposals, newProposal]);
    },
    []
  );

  const votedProposalEventHandler = useCallback((proposalId) => {
    setAllProposals((prevProposals) =>
      prevProposals.map((proposal) => {
        if (proposal.id === Number(proposalId))
          return {
            ...proposal,
            voteCount: proposal.voteCount + 1,
            isVoted: true,
          };
        return proposal;
      })
    );
  }, []);

  const proposalEventHandler = useCallback(() => {}, []);

  useEffect(() => {
    readOnlyProposalContract.on("ProposalCreated", createdProposalEventHandler);

    readOnlyProposalContract.on("Voted", votedProposalEventHandler);

    readOnlyProposalContract.on("ProposalExecuted", proposalEventHandler);

    return () => {
      readOnlyProposalContract.off(
        "ProposalCreated",
        createdProposalEventHandler
      );
      readOnlyProposalContract.off("Voted", votedProposalEventHandler);

      readOnlyProposalContract.off("ProposalExecuted", proposalEventHandler);
    };
  }, [
    readOnlyProposalContract,
    handleCreatedProposalEvent,
    handleVotedProposalEvent,
  ]);

  return allProposals;
};
