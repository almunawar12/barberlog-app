<?php

namespace App\Exceptions;

use RuntimeException;

/** Thrown inside a DB transaction to roll back a create that lost an idempotency race. */
class DuplicateSubmission extends RuntimeException {}
