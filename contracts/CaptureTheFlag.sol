// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract CaptureTheFlag is Ownable {

	bytes32 public whiteListRootHash;

	address public currentFlagHolder;

	event AddNewMember(address newMember, bytes32 oldRoot, bytes32 newRoot);
	
	function addMember(address newMember, address[] memory oldAddresses) public payable onlyOwner {
		bytes32 oldHash = getRootHash(oldAddresses);
		require(oldHash == whiteListRootHash, 'CaptureTheFlag: Roots do not match');
		address[] memory newAddresses = new address[](oldAddresses.length + 1);
		for (uint256 i; i < oldAddresses.length; i++) {
			newAddresses[i] = oldAddresses[i];
		}
		newAddresses[newAddresses.length - 1] = newMember;
		bytes32 newHash = getRootHash(newAddresses);
		whiteListRootHash = newHash;
		emit AddNewMember(newMember, oldHash, newHash);
	}
	
	function fillAddresses(address[] memory addresses) internal pure returns(address[] memory) {
		uint256 length = addresses.length;
		uint256 newLength = length;
		while (newLength & (newLength - 1) != 0) {
			newLength++;
		}
		address[] memory newAddresses = new address[](newLength);
		for (uint256 i; i < length; i++) {
			newAddresses[i] = addresses[i];
		}
		return newAddresses;
	}
	
//  sort is not important
//	function sortAddresses(address[] memory addresses) public pure returns (address[] memory) {
//		quickSort(addresses, int(0), int(addresses.length - 1));
//		return addresses;
//	}
	
	function quickSort(address[] memory addresses, int left, int right) public pure {
		int i = left;
		int j = right;
		if(i==j) return;
		address pivot = addresses[uint(left + (right - left) / 2)];
		while (i <= j) {
			while (addresses[uint(i)] < pivot) i++;
			while (pivot < addresses[uint(j)]) j--;
			if (i <= j) {
				(addresses[uint(i)],addresses[uint(j)]) = (addresses[uint(j)], addresses[uint(i)]);
				i++;
				j--;
			}
		}
		if (left < j)
			quickSort(addresses, left, j);
		if (i < right)
			quickSort(addresses, i, right);
	}
	
	function getLeaves(address[] memory addresses) internal pure returns(bytes32[] memory) {
		uint256 length = addresses.length;
//		addresses = sortAddresses(addresses); // sorting
		bytes32[] memory leaves = new bytes32[](length);
		for (uint256 i; i < length; i++) {
			leaves[i] = keccak256(abi.encodePacked(i, addresses[i])); // get hash from original data
		}
		return leaves;
	}
	
	function getNodes(address[] memory addresses) internal pure returns(bytes32[] memory) {
		bytes32[] memory leaves = getLeaves(addresses);
		uint256 length = leaves.length;
		uint256 nodeCount = (length * 2) - 1; // length of all nodes
		bytes32[] memory nodes = new bytes32[](nodeCount);
		for (uint256 i = 0; i < leaves.length; i++) {
			nodes[i] = leaves[i]; // put first layer of hashes to nodes
		}
		uint256 path = length; // path equal to current layer length
		uint256 offset = 0; // needs to skip passed layer
		uint256 iteration = length;
		while (path > 0) {
			for (uint256 i = 0; i < path - 1; i += 2) {
				nodes[iteration] = keccak256(
					abi.encodePacked(nodes[offset + i], nodes[offset + i + 1])
					// get hashes on next layers, until root, last item of nodes is rootHash
				);
				iteration++;
			}
			offset += path;
			path /= 2; // get next layer length
		}
		return nodes;
	}
	
	function getRootHash(address[] memory addresses) internal pure returns(bytes32) {
		if (addresses.length == 0) {
			return bytes32(0);
		}
		bytes32[] memory nodes = getNodes(fillAddresses(addresses));
		return nodes[nodes.length - 1];
	}
	
	function log2(uint256 x) public pure returns (uint256 y) {
		assembly {
			let arg := x
			x := sub(x,1)
			x := or(x, div(x, 0x02))
			x := or(x, div(x, 0x04))
			x := or(x, div(x, 0x10))
			x := or(x, div(x, 0x100))
			x := or(x, div(x, 0x10000))
			x := or(x, div(x, 0x100000000))
			x := or(x, div(x, 0x10000000000000000))
			x := or(x, div(x, 0x100000000000000000000000000000000))
			x := add(x, 1)
			let m := mload(0x40)
			mstore(m,           0xf8f9cbfae6cc78fbefe7cdc3a1793dfcf4f0e8bbd8cec470b6a28a7a5a3e1efd)
			mstore(add(m,0x20), 0xf5ecf1b3e9debc68e1d9cfabc5997135bfb7a7a3938b7b606b5b4b3f2f1f0ffe)
			mstore(add(m,0x40), 0xf6e4ed9ff2d6b458eadcdf97bd91692de2d4da8fd2d0ac50c6ae9a8272523616)
			mstore(add(m,0x60), 0xc8c0b887b0a8a4489c948c7f847c6125746c645c544c444038302820181008ff)
			mstore(add(m,0x80), 0xf7cae577eec2a03cf3bad76fb589591debb2dd67e0aa9834bea6925f6a4a2e0e)
			mstore(add(m,0xa0), 0xe39ed557db96902cd38ed14fad815115c786af479b7e83247363534337271707)
			mstore(add(m,0xc0), 0xc976c13bb96e881cb166a933a55e490d9d56952b8d4e801485467d2362422606)
			mstore(add(m,0xe0), 0x753a6d1b65325d0c552a4d1345224105391a310b29122104190a110309020100)
			mstore(0x40, add(m, 0x100))
			let magic := 0x818283848586878898a8b8c8d8e8f929395969799a9b9d9e9faaeb6bedeeff
			let shift := 0x100000000000000000000000000000000000000000000000000000000000000
			let a := div(mul(x, magic), shift)
			y := div(mload(add(m,sub(255,a))), shift)
			y := add(y, mul(256, gt(arg, 0x8000000000000000000000000000000000000000000000000000000000000000)))
		}
	}
	
	function getProof(
		address candidate,
		address[] memory addresses
	) public pure returns(bytes32[] memory proof, uint256 index) {
		address[] memory filledAddresses = fillAddresses(addresses);
		uint256 length = filledAddresses.length;
		uint256 proofLength = log2(length);
		if (proofLength == 0) {
			proofLength = 1;
		}
		proof = new bytes32[](proofLength);
		bytes32[] memory nodes = getNodes(filledAddresses);
//		filledAddresses = sortAddresses(filledAddresses);
		for (uint256 i; i < length; i++) {
			if (filledAddresses[i] == candidate) {
				index = i;
				break;
			}
		}
		uint256 pathItem = index; // pathItem needs to know is item odd
		uint256 pathLayer = length; // current layer length
		uint256 offset = 0; // needs to skip passed layer
		uint256 iteration = 0;
		while (pathLayer > 1) {
			bytes32 node;
			if ((pathItem & 0x01) == 1) { // if odd
				node = nodes[offset + pathItem - 1];
			} else {
				node = nodes[offset + pathItem + 1];
			}
			proof[iteration] = node;
			iteration++;
			offset += pathLayer;
			pathLayer /= 2;
			pathItem /= 2;
		}
	}
	
	function verify(
		address candidate,
		uint256 index,
		bytes32[] calldata proof
	) public view returns(bool) {
		// get leave of current pretender value
		bytes32 node = keccak256(abi.encodePacked(index, candidate));
		uint256 path = index; // path needs to know is item odd
		if (proof[0] != 0) {
			for (uint16 i = 0; i < proof.length; i++) {
				// get next nodes from previous nodes until arrived root
				if ((path & 0x01) == 1) { // if odd
					node = keccak256(abi.encodePacked(proof[i], node));
				} else {
					node = keccak256(abi.encodePacked(node, proof[i]));
				}
				path /= 2;
			}
		}
		return node == whiteListRootHash;
	}

	function capture(uint256 index, bytes32[] calldata proof) public payable {
		require(verify(msg.sender, index, proof), 'CaptureTheFlag: Invalid proof');
		currentFlagHolder = msg.sender;
	}
}
