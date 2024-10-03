import styled, { keyframes } from "styled-components";

export const Rotate = keyframes`
    100% {
        transform: rotate(360deg);
    }
`;

export const ButtonLoader = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 4px solid #fff;
  border-top: 4px solid transparent;
  margin: auto;
  animation: ${Rotate} 0.6s ease infinite;
`;