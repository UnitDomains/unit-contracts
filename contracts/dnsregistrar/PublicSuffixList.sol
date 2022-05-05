// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

interface PublicSuffixList {
    function isPublicSuffix(bytes calldata name) external view returns (bool);
}
