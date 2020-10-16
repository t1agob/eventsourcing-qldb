#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AdsStack } from '../lib/AdsStack';

const app = new cdk.App();
new AdsStack(app, 'AdsStack');

