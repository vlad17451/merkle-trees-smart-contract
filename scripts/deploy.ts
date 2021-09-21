import { CaptureTheFlag } from '../typechain'
import {ethers, run} from 'hardhat'
import {delay} from '../utils'

async function deployCustomToken() {
	const CaptureTheFlag = await ethers.getContractFactory('CaptureTheFlag')
	console.log('starting deploying token...')
	const ctf = await CaptureTheFlag.deploy() as CaptureTheFlag
	console.log('CaptureTheFlag deployed with address: ' + ctf.address)
	console.log('wait of deploying...')
	await ctf.deployed()
	console.log('wait of delay...')
	await delay(25000)
	console.log('starting verify token...')
	try {
		await run('verify:verify', {
			address: ctf!.address,
			contract: 'contracts/CaptureTheFlag.sol:CaptureTheFlag',
			constructorArguments: [],
		});
		console.log('verify success')
	} catch (e: any) {
		console.log(e.message)
	}
}

deployCustomToken()
.then(() => process.exit(0))
.catch(error => {
	console.error(error)
	process.exit(1)
})
